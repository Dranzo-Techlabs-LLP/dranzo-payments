import { Column, Entity, Index, JoinTable, ManyToMany, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Contact } from './contact.entity';
import { Tag } from './tag.entity';

export enum ClientStatus {
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  CHURNED = 'CHURNED',
}

@Entity({ name: 'clients' })
export class Client extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 36, name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'varchar', length: 255, name: 'legal_name' })
  legalName!: string;

  @Column({ type: 'varchar', length: 255, name: 'display_name' })
  displayName!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  industry?: string | null;

  @Column({ type: 'varchar', length: 2, default: 'IN' })
  country!: string;

  @Column({ type: 'char', length: 3, default: 'INR' })
  currency!: string;

  @Column({ type: 'varchar', length: 32, name: 'tax_id', nullable: true })
  taxId?: string | null;

  @Column({ type: 'varchar', length: 8, name: 'place_of_supply', nullable: true })
  placeOfSupply?: string | null;

  @Column({ type: 'json', name: 'billing_address', nullable: true })
  billingAddress?: Record<string, unknown> | null;

  @Column({ type: 'json', name: 'shipping_address', nullable: true })
  shippingAddress?: Record<string, unknown> | null;

  @Column({
    type: 'enum',
    enum: ClientStatus,
    default: ClientStatus.ACTIVE,
  })
  status!: ClientStatus;

  @Column({ type: 'char', length: 36, name: 'account_manager_id', nullable: true })
  accountManagerId?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @OneToMany(() => Contact, (c) => c.client)
  contacts?: Contact[];

  @ManyToMany(() => Tag)
  @JoinTable({
    name: 'client_tags',
    joinColumn: { name: 'client_id' },
    inverseJoinColumn: { name: 'tag_id' },
  })
  tags?: Tag[];
}
