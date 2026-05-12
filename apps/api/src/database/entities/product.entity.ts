import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Plan } from './plan.entity';

@Entity({ name: 'products' })
export class Product extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 36, name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  sku?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  category?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @OneToMany(() => Plan, (p) => p.product)
  plans?: Plan[];
}
