import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Invitation } from '../../database/entities/invitation.entity';
import { User } from '../../database/entities/user.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private readonly invitations: Repository<Invitation>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly cfg: ConfigService,
    private readonly audit: AuditService,
    private readonly ds: DataSource,
  ) {}

  async create(actor: AuthenticatedUser, dto: CreateInvitationDto, ip?: string) {
    const emailLc = dto.email.toLowerCase();

    const existingUser = await this.users.findOne({
      where: { organizationId: actor.organizationId, email: emailLc },
    });
    if (existingUser) throw new ConflictException('User already in organization');

    const existingOpen = await this.invitations.findOne({
      where: {
        organizationId: actor.organizationId,
        email: emailLc,
        acceptedAt: IsNull(),
      },
    });
    if (existingOpen) {
      throw new ConflictException('Pending invitation already exists');
    }

    const token = crypto.randomBytes(24).toString('hex');
    const tokenHash = this.hash(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7d

    const inv = this.invitations.create({
      organizationId: actor.organizationId,
      email: emailLc,
      role: dto.role,
      tokenHash,
      expiresAt,
      invitedBy: actor.userId,
      createdBy: actor.userId,
    });
    await this.invitations.save(inv);

    await this.audit.record({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: 'invite_user',
      entity: 'Invitation',
      entityId: inv.id,
      after: { email: inv.email, role: inv.role },
      ip,
    });

    const webUrl = this.cfg.get<string>('WEB_URL', 'http://localhost:5173');
    return {
      id: inv.id,
      email: inv.email,
      role: inv.role,
      expiresAt: inv.expiresAt,
      acceptUrl: `${webUrl}/accept-invite?token=${token}`,
      // token returned ONLY at creation for now (email delivery in Slice 6).
      tokenForEmail: token,
    };
  }

  list(organizationId: string) {
    return this.invitations.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async revoke(actor: AuthenticatedUser, id: string, ip?: string) {
    const inv = await this.invitations.findOne({
      where: { id, organizationId: actor.organizationId },
    });
    if (!inv) throw new NotFoundException();
    if (inv.acceptedAt) throw new BadRequestException('Already accepted');
    await this.invitations.softRemove(inv);

    await this.audit.record({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: 'revoke_invitation',
      entity: 'Invitation',
      entityId: inv.id,
      ip,
    });
  }

  async accept(dto: AcceptInvitationDto, ip?: string) {
    const hash = this.hash(dto.token);
    return this.ds.transaction(async (mgr) => {
      const inv = await mgr.findOne(Invitation, { where: { tokenHash: hash } });
      if (!inv) throw new NotFoundException('Invitation not found');
      if (inv.acceptedAt) throw new BadRequestException('Already accepted');
      if (inv.expiresAt < new Date()) {
        throw new BadRequestException('Invitation expired');
      }

      const dupe = await mgr.findOne(User, {
        where: { organizationId: inv.organizationId, email: inv.email },
      });
      if (dupe) throw new ConflictException('User already exists');

      const rounds = parseInt(this.cfg.get<string>('BCRYPT_ROUNDS', '12'), 10);
      const passwordHash = await bcrypt.hash(dto.password, rounds);

      const user = mgr.create(User, {
        organizationId: inv.organizationId,
        email: inv.email,
        name: dto.name,
        passwordHash,
        role: inv.role,
        isActive: true,
        createdBy: inv.invitedBy,
      });
      await mgr.save(user);

      inv.acceptedAt = new Date();
      inv.acceptedUserId = user.id;
      await mgr.save(inv);

      await this.audit.record({
        organizationId: inv.organizationId,
        actorId: user.id,
        action: 'accept_invitation',
        entity: 'User',
        entityId: user.id,
        after: { email: user.email, role: user.role },
        ip,
      });

      return { userId: user.id, organizationId: inv.organizationId };
    });
  }

  private hash(s: string): string {
    return crypto.createHash('sha256').update(s).digest('hex');
  }
}
