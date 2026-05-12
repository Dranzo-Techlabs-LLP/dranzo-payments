import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, MinLength } from 'class-validator';

export class AcceptInvitationDto {
  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 255)
  name!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;
}
