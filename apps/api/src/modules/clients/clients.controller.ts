import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { UpsertClientDto } from './dto/upsert-client.dto';
import { UpsertContactDto } from './dto/upsert-contact.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly svc: ClientsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.FINANCE, Role.ACCOUNT_MANAGER, Role.VIEWER)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.svc.list(user.organizationId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.FINANCE, Role.ACCOUNT_MANAGER, Role.VIEWER)
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.findOne(user.organizationId, id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.ACCOUNT_MANAGER)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertClientDto, @Ip() ip: string) {
    return this.svc.create(user, dto, ip);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ACCOUNT_MANAGER)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertClientDto, @Ip() ip: string) {
    return this.svc.update(user, id, dto, ip);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Ip() ip: string) {
    return this.svc.remove(user, id, ip);
  }

  @Post(':id/contacts')
  @Roles(Role.ADMIN, Role.ACCOUNT_MANAGER)
  addContact(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpsertContactDto,
    @Ip() ip: string,
  ) {
    return this.svc.addContact(user, id, dto, ip);
  }

  @Patch('contacts/:contactId')
  @Roles(Role.ADMIN, Role.ACCOUNT_MANAGER)
  updateContact(
    @CurrentUser() user: AuthenticatedUser,
    @Param('contactId') contactId: string,
    @Body() dto: UpsertContactDto,
    @Ip() ip: string,
  ) {
    return this.svc.updateContact(user, contactId, dto, ip);
  }

  @Delete('contacts/:contactId')
  @Roles(Role.ADMIN, Role.ACCOUNT_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeContact(
    @CurrentUser() user: AuthenticatedUser,
    @Param('contactId') contactId: string,
    @Ip() ip: string,
  ) {
    return this.svc.removeContact(user, contactId, ip);
  }
}
