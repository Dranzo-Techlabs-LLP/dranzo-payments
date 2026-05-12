import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../../database/entities/payment.entity';
import { Invoice, InvoiceStatus } from '../../database/entities/invoice.entity';
import { LinkedEntityType } from '../../database/entities/task.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { TasksService } from '../tasks/tasks.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { cycleKey } from '../../common/util/date-util';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    private readonly audit: AuditService,
    private readonly tasks: TasksService,
    private readonly subs: SubscriptionsService,
  ) {}

  list(orgId: string) {
    return this.payments.find({
      where: { organizationId: orgId },
      order: { receivedOn: 'DESC' },
    });
  }

  listForInvoice(orgId: string, invoiceId: string) {
    return this.payments.find({
      where: { organizationId: orgId, invoiceId },
      order: { receivedOn: 'ASC' },
    });
  }

  async create(user: AuthenticatedUser, dto: CreatePaymentDto, ip?: string) {
    const inv = await this.invoices.findOne({
      where: { id: dto.invoiceId, organizationId: user.organizationId },
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.status === InvoiceStatus.VOID) {
      throw new BadRequestException('Cannot pay a voided invoice');
    }

    const paid = (await this.payments.find({ where: { invoiceId: inv.id } }))
      .reduce((s, p) => s + p.amount, 0);
    const newTotalPaid = paid + dto.amount;

    if (newTotalPaid > inv.total) {
      throw new BadRequestException(
        `Overpayment: paid ${newTotalPaid} > invoice total ${inv.total}`,
      );
    }

    const payment = this.payments.create({
      organizationId: user.organizationId,
      invoiceId: inv.id,
      amount: dto.amount,
      currency: inv.currency,
      method: dto.method,
      referenceNo: dto.referenceNo,
      receivedOn: dto.receivedOn,
      notes: dto.notes,
      attachmentUrl: dto.attachmentUrl,
      createdBy: user.userId,
      updatedBy: user.userId,
    });
    const saved = await this.payments.save(payment);

    let invoiceClosed = false;
    if (newTotalPaid === inv.total) {
      inv.status = InvoiceStatus.PAID;
      inv.paidAt = new Date();
      await this.invoices.save(inv);
      invoiceClosed = true;

      await this.tasks.closeForLink(
        user.organizationId,
        LinkedEntityType.INVOICE,
        inv.id,
        cycleKey(inv.periodStart),
      );

      if (inv.subscriptionId) {
        await this.subs.rollForward(inv.subscriptionId, user.userId);
      }
    }

    await this.audit.record({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: invoiceClosed ? 'mark_invoice_paid' : 'record_payment',
      entity: 'Payment',
      entityId: saved.id,
      after: { amount: saved.amount, invoiceId: inv.id, invoiceClosed },
      ip,
    });

    return { payment: saved, invoiceClosed, invoice: inv };
  }
}
