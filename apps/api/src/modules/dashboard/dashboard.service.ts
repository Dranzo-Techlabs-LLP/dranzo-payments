import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, Not, Repository } from 'typeorm';
import { Subscription, SubscriptionStatus } from '../../database/entities/subscription.entity';
import { Invoice, InvoiceStatus } from '../../database/entities/invoice.entity';
import { Task, TaskStatus } from '../../database/entities/task.entity';
import { addDays, today } from '../../common/util/date-util';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Subscription) private readonly subs: Repository<Subscription>,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
  ) {}

  async summary(orgId: string) {
    const t = today();
    const in30 = addDays(t, 30);

    const activeSubs = await this.subs.count({
      where: { organizationId: orgId, status: SubscriptionStatus.ACTIVE },
    });
    const upcomingRenewals = await this.subs.count({
      where: {
        organizationId: orgId,
        status: SubscriptionStatus.ACTIVE,
        nextRenewalDate: Between(t, in30),
      },
    });
    const overdueInvoices = await this.invoices
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.total - i.subtotal + i.subtotal), 0)', 'totalOverdue')
      .addSelect('COUNT(*)', 'count')
      .where('i.organization_id = :orgId', { orgId })
      .andWhere('i.status IN (:...st)', { st: [InvoiceStatus.OVERDUE, InvoiceStatus.SENT] })
      .andWhere('i.due_date < :t', { t })
      .getRawOne<{ totalOverdue: string; count: string }>();
    const overdueAmount = Number(overdueInvoices?.totalOverdue ?? 0);
    const overdueCount = Number(overdueInvoices?.count ?? 0);

    const tasksDueToday = await this.tasks.count({
      where: {
        organizationId: orgId,
        status: Not(TaskStatus.DONE),
        dueDate: LessThanOrEqual(t),
      },
    });

    return {
      activeSubscriptions: activeSubs,
      upcomingRenewals30d: upcomingRenewals,
      overdueAmount,
      overdueCount,
      tasksDueToday,
    };
  }
}
