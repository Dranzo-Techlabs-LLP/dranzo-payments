import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricingEngine } from './pricing.engine';
import { PricingController } from './pricing.controller';
import { PricingTier } from '../../database/entities/pricing-tier.entity';
import { Client } from '../../database/entities/client.entity';
import { Organization } from '../../database/entities/organization.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([PricingTier, Client, Organization])],
  controllers: [PricingController],
  providers: [PricingEngine],
  exports: [PricingEngine],
})
export class PricingModule {}
