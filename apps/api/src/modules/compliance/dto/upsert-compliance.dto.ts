import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import {
  ComplianceFrequency,
  ComplianceType,
} from '../../../database/entities/compliance-template.entity';
import { ComplianceItemStatus } from '../../../database/entities/compliance-item.entity';

export class UpsertComplianceTemplateDto {
  @ApiProperty() @IsString() @Length(2, 255) title!: string;
  @ApiProperty({ enum: ComplianceType }) @IsEnum(ComplianceType) type!: ComplianceType;
  @ApiProperty({ enum: ComplianceFrequency }) @IsEnum(ComplianceFrequency) frequency!: ComplianceFrequency;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(31) dayOfMonth?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(12) monthOfYear?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() jurisdiction?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class UpsertComplianceItemDto {
  @ApiProperty() @IsString() @Length(2, 255) title!: string;
  @ApiProperty({ enum: ComplianceType }) @IsEnum(ComplianceType) type!: ComplianceType;
  @ApiProperty({ enum: ComplianceFrequency }) @IsEnum(ComplianceFrequency) frequency!: ComplianceFrequency;
  @ApiProperty() @IsDateString() nextDueDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) reminderLeadDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() ownerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() clientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() templateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() jurisdiction?: string;
  @ApiPropertyOptional({ enum: ComplianceItemStatus }) @IsOptional() @IsEnum(ComplianceItemStatus) status?: ComplianceItemStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
