import { Global, Module } from '@nestjs/common';
import { PricingEngine } from './pricing.engine';

@Global()
@Module({
  providers: [PricingEngine],
  exports: [PricingEngine],
})
export class PricingModule {}
