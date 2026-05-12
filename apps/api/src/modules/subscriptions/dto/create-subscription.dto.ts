import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { BillingCycle } from '../../../database/entities/subscription.entity';

export class CreateSubscriptionDto {
  @ApiProperty() @IsUUID() clientId!: string;
  @ApiProperty() @IsUUID() planId!: string;
  @ApiProperty() @IsUUID() pricingTierId!: string;
  @ApiProperty({ enum: BillingCycle }) @IsEnum(BillingCycle) billingCycle!: BillingCycle;
  @ApiProperty({ example: '2026-05-15' }) @IsDateString() startDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) unitCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) customRateOverride?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) reminderLeadDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoRenew?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
