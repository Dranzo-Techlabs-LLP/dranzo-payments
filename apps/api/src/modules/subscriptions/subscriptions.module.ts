import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from '../../database/entities/subscription.entity';
import { SubscriptionEvent } from '../../database/entities/subscription-event.entity';
import { Client } from '../../database/entities/client.entity';
import { Plan } from '../../database/entities/plan.entity';
import { PricingTier } from '../../database/entities/pricing-tier.entity';
import { Organization } from '../../database/entities/organization.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, SubscriptionEvent, Client, Plan, PricingTier, Organization]),
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
