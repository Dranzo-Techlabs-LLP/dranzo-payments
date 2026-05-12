import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Client } from './client.entity';

export enum ContactRole {
  POC = 'POC',
  BILLING = 'BILLING',
  TECHNICAL = 'TECHNICAL',
  DECISION_MAKER = 'DECISION_MAKER',
  OTHER = 'OTHER',
}

@Entity({ name: 'contacts' })
export class Contact extends BaseEntity {
  @Column({ type: 'char', length: 36, name: 'organization_id' })
  organizationId!: string;

  @Index()
  @Column({ type: 'char', length: 36, name: 'client_id' })
  clientId!: string;

  @ManyToOne(() => Client, (c) => c.contacts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client?: Client;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'enum', enum: ContactRole, default: ContactRole.POC })
  role!: ContactRole;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  phone?: string | null;

  @Column({ type: 'boolean', name: 'is_primary', default: false })
  isPrimary!: boolean;
}
