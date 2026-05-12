import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PricingModelType } from '../../../database/entities/pricing-tier.entity';

class TierSlabDto {
  @ApiPropertyOptional({ description: 'null = open-ended top slab' })
  @IsOptional()
  @IsInt()
  upTo!: number | null;

  @ApiProperty({ description: 'minor units (paise/cents)' })
  @IsInt()
  @Min(0)
  perUnitAmount!: number;
}

export class UpsertTierDto {
  @ApiProperty() @IsUUID() planId!: string;
  @ApiProperty() @IsString() @Length(2, 255) name!: string;
  @ApiProperty({ enum: PricingModelType }) @IsEnum(PricingModelType) modelType!: PricingModelType;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) baseAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) perUnitAmount?: number;
  @ApiPropertyOptional({ example: 18 }) @IsOptional() @IsNumber() taxRate?: number;
  @ApiPropertyOptional({ type: [TierSlabDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TierSlabDto)
  tierSlabs?: TierSlabDto[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) minUnits?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) maxUnits?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
