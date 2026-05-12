import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Invoice } from './invoice.entity';
import { bigIntT } from './pricing-tier.entity';

export enum PaymentMethod {
  BANK = 'BANK',
  UPI = 'UPI',
  CARD = 'CARD',
  CHEQUE = 'CHEQUE',
  OTHER = 'OTHER',
}

@Entity({ name: 'payments' })
export class Payment extends BaseEntity {
  @Column({ type: 'char', length: 36, name: 'organization_id' })
  organizationId!: string;

  @Index()
  @Column({ type: 'char', length: 36, name: 'invoice_id' })
  invoiceId!: string;

  @ManyToOne(() => Invoice, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'invoice_id' })
  invoice?: Invoice;

  @Column({ type: 'bigint', transformer: bigIntT })
  amount!: number;

  @Column({ type: 'char', length: 3, default: 'INR' })
  currency!: string;

  @Column({ type: 'enum', enum: PaymentMethod })
  method!: PaymentMethod;

  @Column({ type: 'varchar', length: 128, name: 'reference_no', nullable: true })
  referenceNo?: string | null;

  @Column({ type: 'date', name: 'received_on' })
  receivedOn!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'varchar', length: 1024, name: 'attachment_url', nullable: true })
  attachmentUrl?: string | null;
}
