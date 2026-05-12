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
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly svc: SubscriptionsService) {}

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

  @Get(':id/preview')
  @Roles(Role.ADMIN, Role.FINANCE, Role.ACCOUNT_MANAGER, Role.VIEWER)
  preview(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.preview(user.organizationId, id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.FINANCE, Role.ACCOUNT_MANAGER)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSubscriptionDto, @Ip() ip: string) {
    return this.svc.create(user, dto, ip);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.FINANCE, Role.ACCOUNT_MANAGER)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
    @Ip() ip: string,
  ) {
    return this.svc.update(user, id, dto, ip);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Ip() ip: string) {
    return this.svc.remove(user, id, ip);
  }
}
