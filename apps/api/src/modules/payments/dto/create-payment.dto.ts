import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../../../database/entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty() @IsUUID() invoiceId!: string;
  @ApiProperty({ description: 'minor units' }) @IsInt() @Min(1) amount!: number;
  @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) method!: PaymentMethod;
  @ApiProperty() @IsDateString() receivedOn!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() attachmentUrl?: string;
}
