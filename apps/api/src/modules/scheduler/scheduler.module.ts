import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from '../../database/entities/subscription.entity';
import { ComplianceItem } from '../../database/entities/compliance-item.entity';
import { Client } from '../../database/entities/client.entity';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { InvoicesModule } from '../invoices/invoices.module';
import { ComplianceModule } from '../compliance/compliance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, ComplianceItem, Client]),
    InvoicesModule,
    ComplianceModule,
  ],
  controllers: [SchedulerController],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
