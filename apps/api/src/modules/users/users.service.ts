import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly audit: AuditService,
  ) {}

  list(organizationId: string) {
    return this.users.find({
      where: { organizationId },
      select: [
        'id',
        'email',
        'name',
        'role',
        'isActive',
        'lastLoginAt',
        'createdAt',
      ],
      order: { createdAt: 'ASC' },
    });
  }

  async update(actor: AuthenticatedUser, userId: string, dto: UpdateUserDto, ip?: string) {
    const target = await this.users.findOne({
      where: { id: userId, organizationId: actor.organizationId },
    });
    if (!target) throw new NotFoundException();

    if (target.id === actor.userId && dto.role && dto.role !== target.role) {
      throw new BadRequestException('Cannot change your own role');
    }
    if (target.id === actor.userId && dto.isActive === false) {
      throw new BadRequestException('Cannot deactivate yourself');
    }
    if (dto.role && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can change roles');
    }

    const before = { ...target };
    Object.assign(target, dto);
    target.updatedBy = actor.userId;
    const saved = await this.users.save(target);

    await this.audit.record({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: 'update_user',
      entity: 'User',
      entityId: target.id,
      before: { ...before, passwordHash: '[redacted]' },
      after: { ...saved, passwordHash: '[redacted]' },
      ip,
    });

    const { passwordHash: _ph, ...rest } = saved;
    void _ph;
    return rest;
  }
}
