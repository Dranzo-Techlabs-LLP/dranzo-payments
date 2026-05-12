import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity({ name: 'subscription_events' })
export class SubscriptionEvent extends BaseEntity {
  @Column({ type: 'char', length: 36, name: 'organization_id' })
  organizationId!: string;

  @Index()
  @Column({ type: 'char', length: 36, name: 'subscription_id' })
  subscriptionId!: string;

  @Column({ type: 'varchar', length: 64, name: 'event_type' })
  eventType!: string;

  @Column({ type: 'json', nullable: true })
  payload?: unknown;

  @Column({ type: 'char', length: 36, name: 'actor_id', nullable: true })
  actorId?: string | null;
}
