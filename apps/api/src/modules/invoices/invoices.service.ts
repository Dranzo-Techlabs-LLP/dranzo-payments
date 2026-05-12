import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from '../../database/entities/invoice.entity';
import { Subscription, SubscriptionStatus } from '../../database/entities/subscription.entity';
import { Organization } from '../../database/entities/organization.entity';
import { Client } from '../../database/entities/client.entity';
import { Plan } from '../../database/entities/plan.entity';
import { PricingTier } from '../../database/entities/pricing-tier.entity';
import { LinkedEntityType, TaskStatus } from '../../database/entities/task.entity';
import { PricingEngine } from '../pricing/pricing.engine';
import { TasksService } from '../tasks/tasks.service';
import { InvoiceNumberService } from './invoice-number.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { addDays, cycleKey, fyCode, today, isoDate } from '../../common/util/date-util';
import { renderInvoiceHtml } from './invoice-render';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(Subscription) private readonly subs: Repository<Subscription>,
    @InjectRepository(Organization) private readonly orgs: Repository<Organization>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(Plan) private readonly plans: Repository<Plan>,
    @InjectRepository(PricingTier) private readonly tiers: Repository<PricingTier>,
    private readonly pricing: PricingEngine,
    private readonly tasks: TasksService,
    private readonly seq: InvoiceNumberService,
    private readonly audit: AuditService,
    private readonly ds: DataSource,
  ) {}

  list(orgId: string) {
    return this.invoices.find({
      where: { organizationId: orgId },
      order: { issueDate: 'DESC', seq: 'DESC' },
    });
  }

  async findOne(orgId: string, id: string) {
    const i = await this.invoices.findOne({ where: { id, organizationId: orgId } });
    if (!i) throw new NotFoundException();
    return i;
  }

  /** Idempotent — uses (org, idempotency_key) unique constraint. */
  async generateForSubscription(
    orgId: string,
    subscriptionId: string,
    opts: { issueDate?: string; dueOffsetDays?: number; actorId?: string | null } = {},
  ): Promise<Invoice> {
    const sub = await this.subs.findOne({ where: { id: subscriptionId, organizationId: orgId } });
    if (!sub) throw new NotFoundException('Subscription not found');

    const idem = `sub:${sub.id}:cycle:${sub.currentPeriodStart}`;
    const existing = await this.invoices.findOne({
      where: { organizationId: orgId, idempotencyKey: idem },
    });
    if (existing && existing.status !== InvoiceStatus.VOID) return existing;
    if (existing && existing.status === InvoiceStatus.VOID) {
      existing.idempotencyKey = `${idem}:void:${existing.id}`;
      await this.invoices.save(existing);
    }

    const [org, client, plan, tier] = await Promise.all([
      this.orgs.findOneByOrFail({ id: orgId }),
      this.clients.findOneByOrFail({ id: sub.clientId, organizationId: orgId }),
      this.plans.findOneByOrFail({ id: sub.planId, organizationId: orgId }),
      this.tiers.findOneByOrFail({ id: sub.pricingTierId, organizationId: orgId }),
    ]);

    const preview = this.pricing.preview(
      sub,
      tier,
      org,
      client,
      sub.billingCycle,
      sub.currentPeriodStart,
      sub.currentPeriodEnd,
    );

    const issue = opts.issueDate ?? today();
    const due = addDays(issue, opts.dueOffsetDays ?? 7);
    const fy = fyCode(issue);

    return this.ds.transaction(async (mgr) => {
      const { invoiceNo, seq } = await this.seq.nextNumber(mgr, orgId, org.invoicePrefix, fy);
      const inv = mgr.create(Invoice, {
        organizationId: orgId,
        clientId: client.id,
        subscriptionId: sub.id,
        invoiceNo,
        fyCode: fy,
        seq,
        issueDate: issue,
        dueDate: due,
        periodStart: sub.currentPeriodStart,
        periodEnd: sub.currentPeriodEnd,
        currency: sub.currency,
        lineItems: preview.lineItems,
        subtotal: preview.subtotal,
        tax: preview.tax,
        total: preview.total,
        status: InvoiceStatus.SENT,
        idempotencyKey: idem,
        notes: tier.name,
        sentAt: new Date(),
        createdBy: opts.actorId ?? null,
        updatedBy: opts.actorId ?? null,
      });
      const saved = await mgr.save(inv);

      await this.tasks.upsertAuto({
        organizationId: orgId,
        clientId: client.id,
        title: `Collect payment — ${invoiceNo} — ${client.displayName}`,
        description: `Invoice ${invoiceNo} due ${due}`,
        dueDate: due,
        assigneeId: client.accountManagerId ?? null,
        linkedEntityType: LinkedEntityType.INVOICE,
        linkedEntityId: saved.id,
        cycleKey: cycleKey(sub.currentPeriodStart),
        status: TaskStatus.IN_PROGRESS,
      });

      await this.audit.record({
        organizationId: orgId,
        actorId: opts.actorId ?? null,
        action: 'generate_invoice',
        entity: 'Invoice',
        entityId: saved.id,
        after: { invoiceNo, total: saved.total, status: saved.status },
      });
      return saved;
    });
  }

  async voidInvoice(user: AuthenticatedUser, id: string, ip?: string) {
    const i = await this.findOne(user.organizationId, id);
    if (i.status === InvoiceStatus.PAID) throw new NotFoundException('Cannot void a paid invoice');
    i.status = InvoiceStatus.VOID;
    const saved = await this.invoices.save(i);
    await this.audit.record({
      organizationId: user.organizationId, actorId: user.userId,
      action: 'void_invoice', entity: 'Invoice', entityId: id, after: saved, ip,
    });
    return saved;
  }

  async renderHtml(orgId: string, id: string): Promise<string> {
    const i = await this.findOne(orgId, id);
    const org = await this.orgs.findOneByOrFail({ id: orgId });
    const c = await this.clients.findOneByOrFail({ id: i.clientId, organizationId: orgId });
    return renderInvoiceHtml(i, org, c);
  }

  /** Scheduler: mark overdue invoices. */
  async markOverdueDueByYesterday(orgId?: string) {
    const yesterday = addDays(today(), -1);
    const where: any = {
      status: InvoiceStatus.SENT,
      dueDate: LessThan(yesterday),
    };
    if (orgId) where.organizationId = orgId;
    const rows = await this.invoices.find({ where });
    for (const inv of rows) {
      inv.status = InvoiceStatus.OVERDUE;
      await this.invoices.save(inv);
      const sub = await this.subs.findOne({ where: { id: inv.subscriptionId ?? '' } });
      if (sub) {
        await this.tasks.moveToOverdue(
          inv.organizationId,
          LinkedEntityType.INVOICE,
          inv.id,
          cycleKey(inv.periodStart),
        );
      }
    }
    return rows.length;
  }

  /** Tests / helpers. */
  protected _today() {
    return today();
  }
  protected _iso(d: Date) {
    return isoDate(d);
  }
}
