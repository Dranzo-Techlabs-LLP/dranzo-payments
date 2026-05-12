import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity({ name: 'organizations' })
export class Organization extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 255, name: 'legal_name' })
  legalName!: string;

  @Column({ type: 'varchar', length: 255, name: 'display_name' })
  displayName!: string;

  @Column({ type: 'varchar', length: 2, name: 'country', default: 'IN' })
  country!: string;

  @Column({ type: 'char', length: 3, name: 'default_currency', default: 'INR' })
  defaultCurrency!: string;

  @Column({ type: 'varchar', length: 32, name: 'tax_id', nullable: true })
  taxId?: string | null;

  @Column({ type: 'varchar', length: 16, name: 'invoice_prefix', default: 'INV' })
  invoicePrefix!: string;

  @Column({ type: 'varchar', length: 1024, name: 'logo_url', nullable: true })
  logoUrl?: string | null;

  @Column({ type: 'json', name: 'address', nullable: true })
  address?: Record<string, unknown> | null;

  @Column({ type: 'json', name: 'bank_details', nullable: true })
  bankDetails?: Record<string, unknown> | null;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'signing_authority',
    nullable: true,
  })
  signingAuthority?: string | null;

  @Column({ type: 'text', name: 'invoice_footer', nullable: true })
  invoiceFooter?: string | null;

  @Column({ type: 'varchar', length: 64, name: 'timezone', default: 'Asia/Kolkata' })
  timezone!: string;

  @OneToMany(() => User, (u) => u.organization)
  users?: User[];
}
