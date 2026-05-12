import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { BillingCycle } from '../../../database/entities/subscription.entity';
import { PricingModelType } from '../../../database/entities/pricing-tier.entity';

export class CreateSubscriptionDto {
  @ApiProperty() @IsUUID() clientId!: string;

  @ApiProperty({ enum: BillingCycle }) @IsEnum(BillingCycle) billingCycle!: BillingCycle;
  @ApiProperty({ example: '2026-05-15' }) @IsDateString() startDate!: string;

  // Inline rate — replaces the catalog tier picker.
  @ApiProperty({
    enum: PricingModelType,
    description: 'Rate model. PER_USER_* multiplies by unitCount; FLAT_* / ONE_TIME use baseAmount.',
  })
  @IsEnum(PricingModelType)
  modelType!: PricingModelType;

  @ApiPropertyOptional({ description: 'Currency ISO code; defaults to client currency.' })
  @IsOptional() @IsString() @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Flat or one-time amount in minor units (paise/cents).' })
  @IsOptional() @IsInt() @Min(0)
  baseAmount?: number;

  @ApiPropertyOptional({ description: 'Per-user amount in minor units (paise/cents).' })
  @IsOptional() @IsInt() @Min(0)
  perUnitAmount?: number;

  @ApiPropertyOptional({ description: 'Tax rate %, e.g. 18 for 18% GST.' })
  @IsOptional() @IsNumber()
  taxRate?: number;

  @ApiPropertyOptional({ description: 'Short label for the rate row (free-form).' })
  @IsOptional() @IsString() @Length(1, 255)
  rateLabel?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) unitCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) reminderLeadDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoRenew?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
