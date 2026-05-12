import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Subscription, SubscriptionStatus } from '../../database/entities/subscription.entity';
import { ComplianceItem, ComplianceItemStatus } from '../../database/entities/compliance-item.entity';
import { Client } from '../../database/entities/client.entity';
import { TasksService } from '../tasks/tasks.service';
import { ComplianceService } from '../compliance/compliance.service';
import { InvoicesService } from '../invoices/invoices.service';
import { LinkedEntityType, TaskStatus } from '../../database/entities/task.entity';
import { addDays, cycleKey, today } from '../../common/util/date-util';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger('Scheduler');

  constructor(
    @InjectRepository(Subscription) private readonly subs: Repository<Subscription>,
    @InjectRepository(ComplianceItem) private readonly citems: Repository<ComplianceItem>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    private readonly tasks: TasksService,
    private readonly compliance: ComplianceService,
    private readonly invoices: InvoicesService,
  ) {}

  /** Daily at 02:00. */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async dailyScan() {
    await this.runOnce();
  }

  /** Public so the controller (or tests) can trigger manually. */
  async runOnce(orgId?: string) {
    const t = today();
    let reminders = 0;
    let dueGenerated = 0;
    let overdue = 0;
    let complianceTasks = 0;

    // 1. subscription reminders (renewal - leadDays <= today)
    const upcoming = await this.subs.find({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
      },
    });
    for (const s of upcoming) {
      const remindOn = addDays(s.nextRenewalDate, -s.reminderLeadDays);
      if (remindOn > t) continue;

      const client = await this.clients.findOne({ where: { id: s.clientId } });
      await this.tasks.upsertAuto({
        organizationId: s.organizationId,
        clientId: s.clientId,
        title: `Renewal due ${s.nextRenewalDate} — ${client?.displayName ?? 'client'}`,
        description: `Subscription renewal upcoming on ${s.nextRenewalDate}.`,
        dueDate: s.nextRenewalDate,
        assigneeId: client?.accountManagerId ?? null,
        linkedEntityType: LinkedEntityType.SUBSCRIPTION,
        linkedEntityId: s.id,
        cycleKey: cycleKey(s.currentPeriodStart),
        status: TaskStatus.TODO,
      });
      reminders++;

      // 2. due-today / past: generate invoice (idempotent) + move task to IN_PROGRESS
      if (s.nextRenewalDate <= t) {
        try {
          await this.invoices.generateForSubscription(s.organizationId, s.id, {
            issueDate: t,
            dueOffsetDays: 7,
            actorId: null,
          });
          dueGenerated++;
        } catch (e) {
          this.logger.warn(`invoice gen failed for sub ${s.id}: ${(e as Error).message}`);
        }
      }
    }

    // 3. overdue invoices
    overdue = await this.invoices.markOverdueDueByYesterday(orgId);

    // 4. compliance reminders
    const items = await this.citems.find({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
        status: ComplianceItemStatus.ACTIVE,
        nextDueDate: LessThanOrEqual(addDays(t, 30)),
      },
    });
    for (const i of items) {
      const remindOn = addDays(i.nextDueDate, -i.reminderLeadDays);
      if (remindOn > t) continue;
      await this.tasks.upsertAuto({
        organizationId: i.organizationId,
        clientId: i.clientId ?? null,
        title: `${i.type.replace('_', ' ')}: ${i.title} due ${i.nextDueDate}`,
        description: i.notes ?? undefined,
        dueDate: i.nextDueDate,
        assigneeId: i.ownerId ?? null,
        linkedEntityType: LinkedEntityType.COMPLIANCE,
        linkedEntityId: i.id,
        cycleKey: i.nextDueDate,
        status: i.nextDueDate <= t ? TaskStatus.IN_PROGRESS : TaskStatus.TODO,
      });
      complianceTasks++;

      if (i.nextDueDate <= t) {
        await this.compliance.rollForwardItem(i.id);
      }
    }

    this.logger.log(
      `scan(${orgId ?? 'all'}) → reminders=${reminders} invoices=${dueGenerated} overdue=${overdue} compliance=${complianceTasks}`,
    );
    return { reminders, dueGenerated, overdue, complianceTasks };
  }
}
