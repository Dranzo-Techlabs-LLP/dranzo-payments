import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { Public } from '../../common/decorators/public.decorator';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInvitationDto,
    @Ip() ip: string,
  ) {
    return this.invitations.create(user, dto, ip);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.invitations.list(user.organizationId);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Ip() ip: string,
  ) {
    return this.invitations.revoke(user, id, ip);
  }

  @Public()
  @Post('accept')
  accept(@Body() dto: AcceptInvitationDto, @Ip() ip: string) {
    return this.invitations.accept(dto, ip);
  }
}
