import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from '../../database/entities/subscription.entity';
import { Invoice } from '../../database/entities/invoice.entity';
import { Task } from '../../database/entities/task.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, Invoice, Task])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
