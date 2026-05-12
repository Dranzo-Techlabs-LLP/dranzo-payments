import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum } from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class CreateInvitationDto {
  @ApiProperty({ example: 'finance@dranzo.test' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role!: Role;
}
