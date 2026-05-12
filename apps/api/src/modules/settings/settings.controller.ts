import { Body, Controller, Get, Ip, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateOrgSettingsDto } from './dto/update-org-settings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings/organization')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.FINANCE, Role.ACCOUNT_MANAGER, Role.VIEWER)
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.settings.get(user.organizationId);
  }

  @Patch()
  @Roles(Role.ADMIN)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOrgSettingsDto,
    @Ip() ip: string,
  ) {
    return this.settings.update(user, dto, ip);
  }
}
