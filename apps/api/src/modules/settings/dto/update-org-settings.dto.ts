import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
} from 'class-validator';

export class UpdateOrgSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 255)
  legalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 255)
  displayName?: string;

  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @ApiPropertyOptional({ example: 'INR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  defaultCurrency?: string;

  @ApiPropertyOptional({ example: '29ABCDE1234F1Z5' })
  @IsOptional()
  @IsString()
  @Length(0, 32)
  taxId?: string;

  @ApiPropertyOptional({ example: 'DRZ' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9-]{2,16}$/, {
    message: 'invoicePrefix must be uppercase alphanumerics/dashes, 2-16 chars',
  })
  invoicePrefix?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  bankDetails?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 255)
  signingAuthority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceFooter?: string;

  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  timezone?: string;
}
