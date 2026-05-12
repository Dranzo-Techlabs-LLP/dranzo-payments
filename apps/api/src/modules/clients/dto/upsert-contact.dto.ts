import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { ContactRole } from '../../../database/entities/contact.entity';

export class UpsertContactDto {
  @ApiProperty()
  @IsString()
  @Length(2, 255)
  name!: string;

  @ApiPropertyOptional({ enum: ContactRole })
  @IsOptional()
  @IsEnum(ContactRole)
  role?: ContactRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
