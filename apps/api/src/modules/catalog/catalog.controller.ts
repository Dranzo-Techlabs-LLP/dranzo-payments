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
import { CatalogService } from './catalog.service';
import { UpsertProductDto } from './dto/upsert-product.dto';
import { UpsertPlanDto } from './dto/upsert-plan.dto';
import { UpsertTierDto } from './dto/upsert-tier.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('catalog')
export class CatalogController {
  constructor(private readonly svc: CatalogService) {}

  @Get('products')
  @Roles(Role.ADMIN, Role.FINANCE, Role.ACCOUNT_MANAGER, Role.VIEWER)
  listProducts(@CurrentUser() user: AuthenticatedUser) {
    return this.svc.listProducts(user.organizationId);
  }

  @Post('products')
  @Roles(Role.ADMIN, Role.FINANCE)
  createProduct(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertProductDto, @Ip() ip: string) {
    return this.svc.createProduct(user, dto, ip);
  }

  @Patch('products/:id')
  @Roles(Role.ADMIN, Role.FINANCE)
  updateProduct(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertProductDto, @Ip() ip: string) {
    return this.svc.updateProduct(user, id, dto, ip);
  }

  @Delete('products/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteProduct(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Ip() ip: string) {
    return this.svc.deleteProduct(user, id, ip);
  }

  @Post('plans')
  @Roles(Role.ADMIN, Role.FINANCE)
  createPlan(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertPlanDto, @Ip() ip: string) {
    return this.svc.createPlan(user, dto, ip);
  }

  @Patch('plans/:id')
  @Roles(Role.ADMIN, Role.FINANCE)
  updatePlan(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertPlanDto, @Ip() ip: string) {
    return this.svc.updatePlan(user, id, dto, ip);
  }

  @Delete('plans/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePlan(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Ip() ip: string) {
    return this.svc.deletePlan(user, id, ip);
  }

  @Post('tiers')
  @Roles(Role.ADMIN, Role.FINANCE)
  createTier(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertTierDto, @Ip() ip: string) {
    return this.svc.createTier(user, dto, ip);
  }

  @Patch('tiers/:id')
  @Roles(Role.ADMIN, Role.FINANCE)
  updateTier(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertTierDto, @Ip() ip: string) {
    return this.svc.updateTier(user, id, dto, ip);
  }

  @Delete('tiers/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTier(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Ip() ip: string) {
    return this.svc.deleteTier(user, id, ip);
  }
}
