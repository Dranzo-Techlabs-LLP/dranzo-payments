import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { SubscriptionStatus } from '../../../database/entities/subscription.entity';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) unitCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) customRateOverride?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) reminderLeadDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoRenew?: boolean;
  @ApiPropertyOptional({ enum: SubscriptionStatus }) @IsOptional() @IsEnum(SubscriptionStatus) status?: SubscriptionStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
