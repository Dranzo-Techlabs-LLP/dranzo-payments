import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../../database/entities/invoice.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { Organization } from '../../database/entities/organization.entity';
import { Client } from '../../database/entities/client.entity';
import { Plan } from '../../database/entities/plan.entity';
import { PricingTier } from '../../database/entities/pricing-tier.entity';
import { InvoiceSequence } from '../../database/entities/invoice-sequence.entity';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { InvoiceNumberService } from './invoice-number.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      Subscription,
      Organization,
      Client,
      Plan,
      PricingTier,
      InvoiceSequence,
    ]),
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoiceNumberService],
  exports: [InvoicesService, InvoiceNumberService],
})
export class InvoicesModule {}
