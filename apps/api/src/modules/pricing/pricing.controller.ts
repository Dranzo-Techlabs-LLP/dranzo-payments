import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PricingEngine, InvoicePreview } from './pricing.engine';
import { PricingTier } from '../../database/entities/pricing-tier.entity';
import { Client } from '../../database/entities/client.entity';
import { Organization } from '../../database/entities/organization.entity';
import {
  BillingCycle,
  Subscription,
} from '../../database/entities/subscription.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { NotFoundException } from '@nestjs/common';

class PreviewDto {
  @IsUUID() pricingTierId!: string;
  @IsOptional() @IsUUID() clientId?: string;
  @IsOptional() @IsInt() @Min(1) unitCount?: number;
  @IsOptional() @IsInt() @Min(0) customRateOverride?: number;
  @IsOptional() @IsEnum(BillingCycle) billingCycle?: BillingCycle;
  @IsOptional() @IsString() periodStart?: string;
  @IsOptional() @IsString() periodEnd?: string;
}

@ApiTags('pricing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pricing')
export class PricingController {
  constructor(
    private readonly engine: PricingEngine,
    @InjectRepository(PricingTier) private readonly tiers: Repository<PricingTier>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(Organization) private readonly orgs: Repository<Organization>,
  ) {}

  @Post('preview')
  @Roles(Role.ADMIN, Role.FINANCE, Role.ACCOUNT_MANAGER, Role.VIEWER)
  async preview(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PreviewDto,
  ): Promise<InvoicePreview> {
    const tier = await this.tiers.findOne({
      where: { id: dto.pricingTierId, organizationId: user.organizationId },
    });
    if (!tier) throw new NotFoundException('Pricing tier not found');
    const org = await this.orgs.findOneByOrFail({ id: user.organizationId });
    const client = dto.clientId
      ? await this.clients.findOne({
          where: { id: dto.clientId, organizationId: user.organizationId },
        })
      : null;

    const fakeClient = client ?? Object.assign(new Client(), {
      taxId: null,
      placeOfSupply: null,
    });
    const fakeSub = Object.assign(new Subscription(), {
      unitCount: dto.unitCount ?? 1,
      customRateOverride: dto.customRateOverride ?? null,
    });

    return this.engine.preview(
      fakeSub,
      tier,
      org,
      fakeClient,
      dto.billingCycle ?? BillingCycle.MONTHLY,
      dto.periodStart ?? new Date().toISOString().slice(0, 10),
      dto.periodEnd ?? new Date().toISOString().slice(0, 10),
    );
  }
}
