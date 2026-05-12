import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  BillingCycle,
  SubscriptionStatus,
} from '../../../database/entities/subscription.entity';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) unitCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) customRateOverride?: number;
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

  @ApiPropertyOptional({
    description: 'Override the next renewal date (anchors the cycle going forward).',
    example: '2026-06-15',
  })
  @IsOptional()
  @IsDateString()
  nextRenewalDate?: string;
}
