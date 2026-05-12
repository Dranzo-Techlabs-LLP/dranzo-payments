import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../database/entities/product.entity';
import { Plan } from '../../database/entities/plan.entity';
import { PricingTier } from '../../database/entities/pricing-tier.entity';
import { UpsertProductDto } from './dto/upsert-product.dto';
import { UpsertPlanDto } from './dto/upsert-plan.dto';
import { UpsertTierDto } from './dto/upsert-tier.dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Plan) private readonly plans: Repository<Plan>,
    @InjectRepository(PricingTier) private readonly tiers: Repository<PricingTier>,
    private readonly audit: AuditService,
  ) {}

  // products
  listProducts(orgId: string) {
    return this.products.find({
      where: { organizationId: orgId },
      relations: { plans: { tiers: true } },
      order: { createdAt: 'DESC' },
    });
  }
  async createProduct(user: AuthenticatedUser, dto: UpsertProductDto, ip?: string) {
    const p = this.products.create({
      organizationId: user.organizationId,
      ...dto,
      isActive: dto.isActive ?? true,
      createdBy: user.userId,
      updatedBy: user.userId,
    });
    const saved = await this.products.save(p);
    await this.audit.record({
      organizationId: user.organizationId, actorId: user.userId,
      action: 'create_product', entity: 'Product', entityId: saved.id, after: saved, ip,
    });
    return saved;
  }
  async updateProduct(user: AuthenticatedUser, id: string, dto: UpsertProductDto, ip?: string) {
    const p = await this.products.findOne({ where: { id, organizationId: user.organizationId } });
    if (!p) throw new NotFoundException();
    Object.assign(p, dto, { updatedBy: user.userId });
    const saved = await this.products.save(p);
    await this.audit.record({
      organizationId: user.organizationId, actorId: user.userId,
      action: 'update_product', entity: 'Product', entityId: saved.id, after: saved, ip,
    });
    return saved;
  }

  // plans
  async createPlan(user: AuthenticatedUser, dto: UpsertPlanDto, ip?: string) {
    const product = await this.products.findOne({
      where: { id: dto.productId, organizationId: user.organizationId },
    });
    if (!product) throw new NotFoundException('Product not found');
    const p = this.plans.create({
      organizationId: user.organizationId,
      productId: product.id,
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive ?? true,
      createdBy: user.userId,
      updatedBy: user.userId,
    });
    const saved = await this.plans.save(p);
    await this.audit.record({
      organizationId: user.organizationId, actorId: user.userId,
      action: 'create_plan', entity: 'Plan', entityId: saved.id, after: saved, ip,
    });
    return saved;
  }
  async updatePlan(user: AuthenticatedUser, id: string, dto: UpsertPlanDto, ip?: string) {
    const p = await this.plans.findOne({ where: { id, organizationId: user.organizationId } });
    if (!p) throw new NotFoundException();
    Object.assign(p, { name: dto.name, description: dto.description, isActive: dto.isActive ?? p.isActive, updatedBy: user.userId });
    const saved = await this.plans.save(p);
    await this.audit.record({
      organizationId: user.organizationId, actorId: user.userId,
      action: 'update_plan', entity: 'Plan', entityId: saved.id, after: saved, ip,
    });
    return saved;
  }

  // tiers
  async createTier(user: AuthenticatedUser, dto: UpsertTierDto, ip?: string) {
    const plan = await this.plans.findOne({ where: { id: dto.planId, organizationId: user.organizationId } });
    if (!plan) throw new NotFoundException('Plan not found');
    const t = this.tiers.create({
      organizationId: user.organizationId,
      planId: plan.id,
      name: dto.name,
      modelType: dto.modelType,
      currency: dto.currency ?? 'INR',
      baseAmount: dto.baseAmount ?? 0,
      perUnitAmount: dto.perUnitAmount ?? 0,
      taxRate: (dto.taxRate ?? 18).toFixed(2),
      tierSlabs: dto.tierSlabs ?? null,
      minUnits: dto.minUnits,
      maxUnits: dto.maxUnits,
      isActive: dto.isActive ?? true,
      createdBy: user.userId,
      updatedBy: user.userId,
    });
    const saved = await this.tiers.save(t);
    await this.audit.record({
      organizationId: user.organizationId, actorId: user.userId,
      action: 'create_pricing_tier', entity: 'PricingTier', entityId: saved.id, after: saved, ip,
    });
    return saved;
  }
  async updateTier(user: AuthenticatedUser, id: string, dto: UpsertTierDto, ip?: string) {
    const t = await this.tiers.findOne({ where: { id, organizationId: user.organizationId } });
    if (!t) throw new NotFoundException();
    Object.assign(t, {
      name: dto.name,
      modelType: dto.modelType,
      currency: dto.currency ?? t.currency,
      baseAmount: dto.baseAmount ?? t.baseAmount,
      perUnitAmount: dto.perUnitAmount ?? t.perUnitAmount,
      taxRate: dto.taxRate != null ? dto.taxRate.toFixed(2) : t.taxRate,
      tierSlabs: dto.tierSlabs ?? t.tierSlabs,
      minUnits: dto.minUnits ?? t.minUnits,
      maxUnits: dto.maxUnits ?? t.maxUnits,
      isActive: dto.isActive ?? t.isActive,
      updatedBy: user.userId,
    });
    const saved = await this.tiers.save(t);
    await this.audit.record({
      organizationId: user.organizationId, actorId: user.userId,
      action: 'update_pricing_tier', entity: 'PricingTier', entityId: saved.id, after: saved, ip,
    });
    return saved;
  }

  async deleteProduct(user: AuthenticatedUser, id: string, ip?: string) {
    const p = await this.products.findOne({ where: { id, organizationId: user.organizationId } });
    if (!p) throw new NotFoundException();
    await this.products.softRemove(p);
    await this.audit.record({
      organizationId: user.organizationId, actorId: user.userId,
      action: 'delete_product', entity: 'Product', entityId: id, ip,
    });
  }

  async deletePlan(user: AuthenticatedUser, id: string, ip?: string) {
    const p = await this.plans.findOne({ where: { id, organizationId: user.organizationId } });
    if (!p) throw new NotFoundException();
    await this.plans.softRemove(p);
    await this.audit.record({
      organizationId: user.organizationId, actorId: user.userId,
      action: 'delete_plan', entity: 'Plan', entityId: id, ip,
    });
  }

  async deleteTier(user: AuthenticatedUser, id: string, ip?: string) {
    const t = await this.tiers.findOne({ where: { id, organizationId: user.organizationId } });
    if (!t) throw new NotFoundException();
    await this.tiers.softRemove(t);
    await this.audit.record({
      organizationId: user.organizationId, actorId: user.userId,
      action: 'delete_pricing_tier', entity: 'PricingTier', entityId: id, ip,
    });
  }
}
