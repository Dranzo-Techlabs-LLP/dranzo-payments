import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { ComplianceTemplate, ComplianceFrequency } from '../../database/entities/compliance-template.entity';
import { ComplianceItem, ComplianceItemStatus } from '../../database/entities/compliance-item.entity';
import { UpsertComplianceTemplateDto, UpsertComplianceItemDto } from './dto/upsert-compliance.dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { addMonths } from '../../common/util/date-util';

@Injectable()
export class ComplianceService {
  constructor(
    @InjectRepository(ComplianceTemplate) private readonly templates: Repository<ComplianceTemplate>,
    @InjectRepository(ComplianceItem) private readonly items: Repository<ComplianceItem>,
    private readonly audit: AuditService,
  ) {}

  // templates
  listTemplates(orgId: string) {
    return this.templates.find({ where: { organizationId: orgId }, order: { title: 'ASC' } });
  }
  async createTemplate(user: AuthenticatedUser, dto: UpsertComplianceTemplateDto, ip?: string) {
    const t = this.templates.create({
      organizationId: user.organizationId,
      ...dto,
      isActive: true,
      createdBy: user.userId,
      updatedBy: user.userId,
    });
    const saved = await this.templates.save(t);
    await this.audit.record({
      organizationId: user.organizationId, actorId: user.userId,
      action: 'create_compliance_template', entity: 'ComplianceTemplate', entityId: saved.id, after: saved, ip,
    });
    return saved;
  }

  // items
  listItems(orgId: string) {
    return this.items.find({
      where: { organizationId: orgId },
      order: { nextDueDate: 'ASC' },
    });
  }

  async createItem(user: AuthenticatedUser, dto: UpsertComplianceItemDto, ip?: string) {
    const i = this.items.create({
      organizationId: user.organizationId,
      ...dto,
      reminderLeadDays: dto.reminderLeadDays ?? 7,
      status: dto.status ?? ComplianceItemStatus.ACTIVE,
      createdBy: user.userId,
      updatedBy: user.userId,
    });
    const saved = await this.items.save(i);
    await this.audit.record({
      organizationId: user.organizationId, actorId: user.userId,
      action: 'create_compliance_item', entity: 'ComplianceItem', entityId: saved.id, after: saved, ip,
    });
    return saved;
  }

  async updateItem(user: AuthenticatedUser, id: string, dto: UpsertComplianceItemDto, ip?: string) {
    const i = await this.items.findOne({ where: { id, organizationId: user.organizationId } });
    if (!i) throw new NotFoundException();
    Object.assign(i, dto, { updatedBy: user.userId });
    const saved = await this.items.save(i);
    await this.audit.record({
      organizationId: user.organizationId, actorId: user.userId,
      action: 'update_compliance_item', entity: 'ComplianceItem', entityId: id, after: saved, ip,
    });
    return saved;
  }

  /** Advance next_due_date based on frequency. Called by scheduler post-task creation. */
  async rollForwardItem(itemId: string) {
    const i = await this.items.findOne({ where: { id: itemId } });
    if (!i) return null;
    const months = freqToMonths(i.frequency);
    if (months == null) {
      i.status = ComplianceItemStatus.ARCHIVED;
    } else {
      i.nextDueDate = addMonths(i.nextDueDate, months);
    }
    return this.items.save(i);
  }

  async findDueByOrEarlier(orgId: string | null, on: string) {
    const where: any = { status: ComplianceItemStatus.ACTIVE, nextDueDate: LessThanOrEqual(on) };
    if (orgId) where.organizationId = orgId;
    return this.items.find({ where });
  }
}

function freqToMonths(f: ComplianceFrequency): number | null {
  switch (f) {
    case ComplianceFrequency.MONTHLY: return 1;
    case ComplianceFrequency.QUARTERLY: return 3;
    case ComplianceFrequency.HALFYEARLY: return 6;
    case ComplianceFrequency.YEARLY: return 12;
    case ComplianceFrequency.ONE_OFF: return null;
  }
}
