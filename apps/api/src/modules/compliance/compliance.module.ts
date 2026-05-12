import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceTemplate } from '../../database/entities/compliance-template.entity';
import { ComplianceItem } from '../../database/entities/compliance-item.entity';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ComplianceTemplate, ComplianceItem])],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
