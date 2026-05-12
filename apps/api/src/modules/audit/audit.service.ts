import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../database/entities/audit-log.entity';

export interface AuditWriteInput {
  organizationId: string;
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async record(input: AuditWriteInput): Promise<AuditLog> {
    const row = this.repo.create({
      organizationId: input.organizationId,
      actorId: input.actorId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      before: input.before ?? null,
      after: input.after ?? null,
      ip: input.ip ?? null,
    });
    return this.repo.save(row);
  }

  async listForOrg(
    organizationId: string,
    take = 100,
    skip = 0,
  ): Promise<{ items: AuditLog[]; total: number }> {
    const [items, total] = await this.repo.findAndCount({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take,
      skip,
    });
    return { items, total };
  }
}
