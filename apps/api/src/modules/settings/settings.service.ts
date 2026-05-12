import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../database/entities/organization.entity';
import { UpdateOrgSettingsDto } from './dto/update-org-settings.dto';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Organization)
    private readonly repo: Repository<Organization>,
    private readonly audit: AuditService,
  ) {}

  async get(orgId: string): Promise<Organization> {
    const org = await this.repo.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException();
    return org;
  }

  async update(
    user: AuthenticatedUser,
    dto: UpdateOrgSettingsDto,
    ip?: string,
  ): Promise<Organization> {
    const org = await this.repo.findOne({ where: { id: user.organizationId } });
    if (!org) throw new NotFoundException();

    const before = { ...org };
    Object.assign(org, dto);
    org.updatedBy = user.userId;
    const saved = await this.repo.save(org);

    await this.audit.record({
      organizationId: org.id,
      actorId: user.userId,
      action: 'update_settings',
      entity: 'Organization',
      entityId: org.id,
      before,
      after: saved,
      ip,
    });

    return saved;
  }

  ensureOwnOrg(user: AuthenticatedUser, orgId: string) {
    if (user.organizationId !== orgId) throw new ForbiddenException();
  }
}
