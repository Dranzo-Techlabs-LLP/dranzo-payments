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
import { ComplianceService } from './compliance.service';
import { UpsertComplianceItemDto, UpsertComplianceTemplateDto } from './dto/upsert-compliance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('compliance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly svc: ComplianceService) {}

  @Get('templates')
  @Roles(Role.ADMIN, Role.FINANCE, Role.ACCOUNT_MANAGER, Role.VIEWER)
  listTemplates(@CurrentUser() user: AuthenticatedUser) {
    return this.svc.listTemplates(user.organizationId);
  }

  @Post('templates')
  @Roles(Role.ADMIN, Role.FINANCE)
  createTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertComplianceTemplateDto,
    @Ip() ip: string,
  ) {
    return this.svc.createTemplate(user, dto, ip);
  }

  @Patch('templates/:id')
  @Roles(Role.ADMIN, Role.FINANCE)
  updateTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpsertComplianceTemplateDto,
    @Ip() ip: string,
  ) {
    return this.svc.updateTemplate(user, id, dto, ip);
  }

  @Delete('templates/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTemplate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Ip() ip: string) {
    return this.svc.deleteTemplate(user, id, ip);
  }

  @Get('items')
  @Roles(Role.ADMIN, Role.FINANCE, Role.ACCOUNT_MANAGER, Role.VIEWER)
  listItems(@CurrentUser() user: AuthenticatedUser) {
    return this.svc.listItems(user.organizationId);
  }

  @Post('items')
  @Roles(Role.ADMIN, Role.FINANCE, Role.ACCOUNT_MANAGER)
  createItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertComplianceItemDto,
    @Ip() ip: string,
  ) {
    return this.svc.createItem(user, dto, ip);
  }

  @Patch('items/:id')
  @Roles(Role.ADMIN, Role.FINANCE, Role.ACCOUNT_MANAGER)
  updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpsertComplianceItemDto,
    @Ip() ip: string,
  ) {
    return this.svc.updateItem(user, id, dto, ip);
  }

  @Delete('items/:id')
  @Roles(Role.ADMIN, Role.FINANCE, Role.ACCOUNT_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteItem(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Ip() ip: string) {
    return this.svc.deleteItem(user, id, ip);
  }
}
