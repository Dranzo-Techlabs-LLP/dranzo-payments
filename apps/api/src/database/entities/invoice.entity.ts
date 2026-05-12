import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { bigIntT } from './pricing-tier.entity';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  amount: number;
  taxRate: number;
  taxAmount: number;
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  VOID = 'VOID',
}

@Entity({ name: 'invoices' })
@Unique('uq_invoices_org_no', ['organizationId', 'invoiceNo'])
@Unique('uq_invoices_idem', ['organizationId', 'idempotencyKey'])
export class Invoice extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 36, name: 'organization_id' })
  organizationId!: string;

  @Index()
  @Column({ type: 'char', length: 36, name: 'client_id' })
  clientId!: string;

  @Column({ type: 'char', length: 36, name: 'subscription_id', nullable: true })
  subscriptionId?: string | null;

  @Column({ type: 'varchar', length: 32, name: 'invoice_no' })
  invoiceNo!: string;

  @Column({ type: 'varchar', length: 8, name: 'fy_code' })
  fyCode!: string;

  @Column({ type: 'int' })
  seq!: number;

  @Column({ type: 'date', name: 'issue_date' })
  issueDate!: string;

  @Column({ type: 'date', name: 'due_date' })
  dueDate!: string;

  @Column({ type: 'date', name: 'period_start' })
  periodStart!: string;

  @Column({ type: 'date', name: 'period_end' })
  periodEnd!: string;

  @Column({ type: 'char', length: 3, default: 'INR' })
  currency!: string;

  @Column({ type: 'json', name: 'line_items' })
  lineItems!: InvoiceLineItem[];

  @Column({ type: 'bigint', default: 0, transformer: bigIntT })
  subtotal!: number;

  @Column({ type: 'bigint', default: 0, transformer: bigIntT })
  tax!: number;

  @Column({ type: 'bigint', default: 0, transformer: bigIntT })
  total!: number;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status!: InvoiceStatus;

  @Column({ type: 'varchar', length: 1024, name: 'pdf_url', nullable: true })
  pdfUrl?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'datetime', precision: 6, name: 'sent_at', nullable: true })
  sentAt?: Date | null;

  @Column({ type: 'datetime', precision: 6, name: 'paid_at', nullable: true })
  paidAt?: Date | null;

  @Column({ type: 'varchar', length: 128, name: 'idempotency_key', nullable: true })
  idempotencyKey?: string | null;
}
