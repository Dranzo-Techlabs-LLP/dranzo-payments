import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'invoice_sequences' })
export class InvoiceSequence {
  @PrimaryColumn({ type: 'char', length: 36, name: 'organization_id' })
  organizationId!: string;

  @PrimaryColumn({ type: 'varchar', length: 8, name: 'fy_code' })
  fyCode!: string;

  @Column({ type: 'int', name: 'last_seq', default: 0 })
  lastSeq!: number;

  @UpdateDateColumn({ type: 'datetime', precision: 6, name: 'updated_at' })
  updatedAt!: Date;
}
