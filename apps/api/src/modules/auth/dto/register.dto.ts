import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'admin@dranzo.test' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Admin@123' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Mohamed Shimil' })
  @IsString()
  @Length(2, 255)
  name!: string;

  @ApiProperty({ example: 'Dranzo Techlabs LLP' })
  @IsString()
  @Length(2, 255)
  organizationName!: string;
}
