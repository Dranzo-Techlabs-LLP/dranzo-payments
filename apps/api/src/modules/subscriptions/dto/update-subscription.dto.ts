import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import {
  BillingCycle,
  SubscriptionStatus,
} from '../../../database/entities/subscription.entity';
import { PricingModelType } from '../../../database/entities/pricing-tier.entity';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) unitCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) reminderLeadDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoRenew?: boolean;
  @ApiPropertyOptional({ enum: SubscriptionStatus })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional({ enum: BillingCycle })
  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @ApiPropertyOptional({ example: '2026-06-15' })
  @IsOptional()
  @IsDateString()
  nextRenewalDate?: string;

  @ApiPropertyOptional({ description: 'null to clear; integer paise to set.' })
  @IsOptional()
  customRateOverride?: number | null;

  // Inline rate edits (mutate the hidden tier).
  @ApiPropertyOptional({ enum: PricingModelType })
  @IsOptional()
  @IsEnum(PricingModelType)
  modelType?: PricingModelType;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) baseAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) perUnitAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() taxRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 255) rateLabel?: string;
}
