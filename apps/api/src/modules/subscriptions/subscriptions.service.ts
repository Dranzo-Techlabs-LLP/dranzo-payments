import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Subscription, SubscriptionStatus } from '../../database/entities/subscription.entity';
import { SubscriptionEvent } from '../../database/entities/subscription-event.entity';
import { Client } from '../../database/entities/client.entity';
import { Plan } from '../../database/entities/plan.entity';
import { PricingTier } from '../../database/entities/pricing-tier.entity';
import { Organization } from '../../database/entities/organization.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { addDays, addMonths, nextRenewal, periodEnd } from '../../common/util/date-util';
import { BillingCycle as BC } from '../../database/entities/subscription.entity';

function addCycle(date: string, cycle: BC, n: number): string {
  switch (cycle) {
    case BC.MONTHLY: return addMonths(date, 1 * n);
    case BC.QUARTERLY: return addMonths(date, 3 * n);
    case BC.HALFYEARLY: return addMonths(date, 6 * n);
    case BC.YEARLY: return addMonths(date, 12 * n);
    case BC.CUSTOM: return addMonths(date, 1 * n);
  }
}
import { PricingEngine, InvoicePreview } from '../pricing/pricing.engine';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription) private readonly subs: Repository<Subscription>,
    @InjectRepository(SubscriptionEvent) private readonly events: Repository<SubscriptionEvent>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(Plan) private readonly plans: Repository<Plan>,
    @InjectRepository(PricingTier) private readonly tiers: Repository<PricingTier>,
    @InjectRepository(Organization) private readonly orgs: Repository<Organization>,
    private readonly audit: AuditService,
    private readonly pricing: PricingEngine,
  ) {}

  async list(orgId: string) {
    const rows = await this.subs.find({
      where: { organizationId: orgId },
      relations: { client: true, plan: true, pricingTier: true },
      order: { nextRenewalDate: 'ASC' },
    });
    const org = await this.orgs.findOne({ where: { id: orgId } });

    // Fetch any tiers that were soft-deleted so we can still price legacy subs.
    const missingTierIds = rows
      .filter((s) => !s.pricingTier && s.pricingTierId)
      .map((s) => s.pricingTierId);
    const ghostTiers = missingTierIds.length
      ? await this.tiers.find({ where: missingTierIds.map((id) => ({ id, organizationId: orgId })), withDeleted: true })
      : [];
    const ghostMap = new Map(ghostTiers.map((t) => [t.id, t]));

    return rows.map((s) => {
      const tier = s.pricingTier ?? ghostMap.get(s.pricingTierId);
      let feePreview: { subtotal: number; tax: number; total: number; currency: string } | null = null;
      try {
        if (org && tier && s.client) {
          const p = this.pricing.preview(
            s,
            tier,
            org,
            s.client,
            s.billingCycle,
            s.currentPeriodStart,
            s.currentPeriodEnd,
          );
          feePreview = { subtotal: p.subtotal, tax: p.tax, total: p.total, currency: p.currency };
        }
      } catch {
        feePreview = null;
      }
      return { ...s, pricingTier: tier ?? null, feePreview };
    });
  }

  async findOne(orgId: string, id: string) {
    const s = await this.subs.findOne({
      where: { id, organizationId: orgId },
      relations: { client: true, plan: true, pricingTier: true },
    });
    if (!s) throw new NotFoundException();
    return s;
  }

  async create(user: AuthenticatedUser, dto: CreateSubscriptionDto, ip?: string) {
    const client = await this.clients.findOne({
      where: { id: dto.clientId, organizationId: user.organizationId },
    });
    if (!client) throw new NotFoundException('Client not found');
    const plan = await this.plans.findOne({
      where: { id: dto.planId, organizationId: user.organizationId },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    const tier = await this.tiers.findOne({
      where: { id: dto.pricingTierId, organizationId: user.organizationId },
    });
    if (!tier) throw new NotFoundException('PricingTier not found');

    const start = dto.startDate;
    const renewal = nextRenewal(start, dto.billingCycle);
    const end = periodEnd(start, dto.billingCycle);

    const sub = this.subs.create({
      organizationId: user.organizationId,
      clientId: client.id,
      planId: plan.id,
      pricingTierId: tier.id,
      billingCycle: dto.billingCycle,
      startDate: start,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      nextRenewalDate: renewal,
      unitCount: dto.unitCount ?? 1,
      customRateOverride: dto.customRateOverride ?? null,
      currency: tier.currency,
      reminderLeadDays: dto.reminderLeadDays ?? 7,
      autoRenew: dto.autoRenew ?? true,
      status: SubscriptionStatus.ACTIVE,
      notes: dto.notes,
      createdBy: user.userId,
      updatedBy: user.userId,
    });
    const saved = await this.subs.save(sub);

    await this.events.save(this.events.create({
      organizationId: user.organizationId,
      subscriptionId: saved.id,
      eventType: 'created',
      payload: { startDate: start, billingCycle: dto.billingCycle, unitCount: saved.unitCount },
      actorId: user.userId,
    }));

    await this.audit.record({
      organizationId: user.organizationId, actorId: user.userId,
      action: 'create_subscription', entity: 'Subscription', entityId: saved.id,
      after: { clientId: client.id, planId: plan.id, tier: tier.modelType, nextRenewal: renewal },
      ip,
    });

    return saved;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateSubscriptionDto, ip?: string) {
    // Load without relations so a soft-deleted tier (relation null) doesn't
    // cascade-null the pricing_tier_id FK on save.
    const s = await this.subs.findOne({ where: { id, organizationId: user.organizationId } });
    if (!s) throw new NotFoundException();
    const before = { ...s };
    if (dto.status === SubscriptionStatus.CANCELLED) {
      s.autoRenew = false;
    }

    if (dto.unitCount !== undefined) s.unitCount = dto.unitCount;
    if (dto.reminderLeadDays !== undefined) s.reminderLeadDays = dto.reminderLeadDays;
    if (dto.autoRenew !== undefined) s.autoRenew = dto.autoRenew;
    if (dto.status !== undefined) s.status = dto.status;
    if (dto.notes !== undefined) s.notes = dto.notes;
    if (dto.billingCycle !== undefined) s.billingCycle = dto.billingCycle;
    if (dto.nextRenewalDate !== undefined) s.nextRenewalDate = dto.nextRenewalDate;
    if (dto.pricingTierId !== undefined) {
      const tier = await this.tiers.findOne({
        where: { id: dto.pricingTierId, organizationId: user.organizationId },
      });
      if (!tier) throw new NotFoundException('Pricing tier not found');
      s.pricingTierId = tier.id;
      s.planId = tier.planId;
      s.currency = tier.currency;
    }
    if (dto.planId !== undefined) s.planId = dto.planId;
    // customRateOverride: explicit handling — null clears, undefined leaves alone
    if ('customRateOverride' in dto) {
      s.customRateOverride = (dto.customRateOverride as number | null | undefined) ?? null;
    }
    s.updatedBy = user.userId;

    // If billing cycle or next renewal date changed, recompute the current
    // period window so invoice generation lines up with the new anchor.
    if (dto.nextRenewalDate || dto.billingCycle) {
      const renewal = s.nextRenewalDate;
      // The current period ends one day before the next renewal.
      s.currentPeriodEnd = addDays(renewal, -1);
      // Anchor current period start by walking one cycle back from renewal.
      s.currentPeriodStart = addCycle(renewal, s.billingCycle, -1);
    }

    const saved = await this.subs.save(s);
    await this.events.save(this.events.create({
      organizationId: user.organizationId,
      subscriptionId: s.id,
      eventType: dto.status ? `status:${dto.status}` : 'updated',
      payload: dto,
      actorId: user.userId,
    }));
    await this.audit.record({
      organizationId: user.organizationId, actorId: user.userId,
      action: 'update_subscription', entity: 'Subscription', entityId: s.id,
      before, after: saved, ip,
    });
    return saved;
  }

  async remove(user: AuthenticatedUser, id: string, ip?: string) {
    const s = await this.findOne(user.organizationId, id);
    await this.subs.softRemove(s);
    await this.events.save(this.events.create({
      organizationId: user.organizationId,
      subscriptionId: s.id,
      eventType: 'deleted',
      actorId: user.userId,
    }));
    await this.audit.record({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: 'delete_subscription',
      entity: 'Subscription',
      entityId: id,
      ip,
    });
  }

  /** Move the subscription forward one cycle. Called after invoice marked paid. */
  async rollForward(subscriptionId: string, actorId?: string) {
    const s = await this.subs.findOne({ where: { id: subscriptionId } });
    if (!s) return null;
    if (!s.autoRenew || s.status === SubscriptionStatus.CANCELLED) return s;

    const newStart = s.nextRenewalDate;
    const newEnd = periodEnd(newStart, s.billingCycle);
    const newRenewal = nextRenewal(newStart, s.billingCycle);

    s.currentPeriodStart = newStart;
    s.currentPeriodEnd = newEnd;
    s.nextRenewalDate = newRenewal;
    s.updatedBy = actorId ?? s.updatedBy;
    const saved = await this.subs.save(s);

    await this.events.save(this.events.create({
      organizationId: s.organizationId,
      subscriptionId: s.id,
      eventType: 'roll_forward',
      payload: { newStart, newEnd, newRenewal },
      actorId: actorId ?? null,
    }));

    return saved;
  }

  async preview(orgId: string, id: string): Promise<InvoicePreview> {
    const s = await this.subs.findOne({
      where: { id, organizationId: orgId },
      relations: { client: true, plan: true },
    });
    if (!s) throw new NotFoundException();
    const tier = await this.tiers.findOne({
      where: { id: s.pricingTierId, organizationId: orgId },
      withDeleted: true,
    });
    if (!tier) throw new NotFoundException('Pricing tier missing');
    const org = await this.orgs.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization missing');
    return this.pricing.preview(
      s,
      tier,
      org,
      s.client!,
      s.billingCycle,
      s.currentPeriodStart,
      s.currentPeriodEnd,
    );
  }

  /** Used by scheduler. */
  async findDueForBilling(orgId: string | null, asOf: string) {
    const where: any = {
      status: SubscriptionStatus.ACTIVE,
      autoRenew: true,
      nextRenewalDate: LessThanOrEqual(asOf),
    };
    if (orgId) where.organizationId = orgId;
    return this.subs.find({ where, relations: { client: true, plan: true, pricingTier: true } });
  }

  /** Subscriptions whose renewal is within `leadDays` of today (for reminders). */
  async findUpcomingRenewals(orgId: string | null, dueByOrEarlier: string) {
    const where: any = {
      status: SubscriptionStatus.ACTIVE,
      autoRenew: true,
      nextRenewalDate: LessThanOrEqual(dueByOrEarlier),
    };
    if (orgId) where.organizationId = orgId;
    return this.subs.find({ where, relations: { client: true, plan: true, pricingTier: true } });
  }
}
