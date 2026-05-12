import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Product } from './product.entity';
import { PricingTier } from './pricing-tier.entity';

@Entity({ name: 'plans' })
export class Plan extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 36, name: 'organization_id' })
  organizationId!: string;

  @Index()
  @Column({ type: 'char', length: 36, name: 'product_id' })
  productId!: string;

  @ManyToOne(() => Product, (p) => p.plans, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @OneToMany(() => PricingTier, (t) => t.plan)
  tiers?: PricingTier[];
}
