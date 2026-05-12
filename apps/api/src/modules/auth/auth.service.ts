import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../../database/entities/user.entity';
import { Organization } from '../../database/entities/organization.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { Invitation } from '../../database/entities/invitation.entity';
import { Role } from '../../common/enums/role.enum';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuditService } from '../audit/audit.service';
import { JwtPayload } from './jwt.strategy';

interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Organization)
    private readonly orgs: Repository<Organization>,
    @InjectRepository(RefreshToken)
    private readonly refresh: Repository<RefreshToken>,
    @InjectRepository(Invitation)
    private readonly invitations: Repository<Invitation>,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
    private readonly audit: AuditService,
    private readonly ds: DataSource,
  ) {}

  async register(dto: RegisterDto, ip?: string): Promise<IssuedTokens & { userId: string; organizationId: string }> {
    const emailLc = dto.email.toLowerCase();

    return this.ds.transaction(async (mgr) => {
      const dup = await mgr.findOne(User, { where: { email: emailLc } });
      if (dup) throw new ConflictException('Email already registered');

      const org = mgr.create(Organization, {
        legalName: dto.organizationName,
        displayName: dto.organizationName,
        country: 'IN',
        defaultCurrency: 'INR',
        invoicePrefix: 'INV',
        timezone: 'Asia/Kolkata',
      });
      await mgr.save(org);

      const rounds = parseInt(this.cfg.get<string>('BCRYPT_ROUNDS', '12'), 10);
      const passwordHash = await bcrypt.hash(dto.password, rounds);

      const user = mgr.create(User, {
        organizationId: org.id,
        email: emailLc,
        name: dto.name,
        passwordHash,
        role: Role.ADMIN,
        isActive: true,
      });
      await mgr.save(user);

      org.createdBy = user.id;
      org.updatedBy = user.id;
      await mgr.save(org);

      const tokens = await this.issueTokens(user, ip);

      await this.audit.record({
        organizationId: org.id,
        actorId: user.id,
        action: 'register',
        entity: 'User',
        entityId: user.id,
        after: { email: user.email, role: user.role, organizationId: org.id },
        ip,
      });

      return { ...tokens, userId: user.id, organizationId: org.id };
    });
  }

  async login(dto: LoginDto, ip?: string): Promise<IssuedTokens & { userId: string; organizationId: string }> {
    const user = await this.users.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    user.lastLoginAt = new Date();
    await this.users.save(user);

    const tokens = await this.issueTokens(user, ip);

    await this.audit.record({
      organizationId: user.organizationId,
      actorId: user.id,
      action: 'login',
      entity: 'User',
      entityId: user.id,
      ip,
    });

    return { ...tokens, userId: user.id, organizationId: user.organizationId };
  }

  async refresh(token: string, ip?: string): Promise<IssuedTokens> {
    const hash = this.hash(token);
    const row = await this.refresh.findOne({ where: { tokenHash: hash } });
    if (!row || row.revokedAt || row.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.users.findOne({ where: { id: row.userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User inactive');
    }

    // rotate
    row.revokedAt = new Date();
    await this.refresh.save(row);

    return this.issueTokens(user, ip);
  }

  async logout(refreshToken: string): Promise<void> {
    const hash = this.hash(refreshToken);
    const row = await this.refresh.findOne({ where: { tokenHash: hash } });
    if (row && !row.revokedAt) {
      row.revokedAt = new Date();
      await this.refresh.save(row);
    }
  }

  async getCurrentUser(userId: string, organizationId: string) {
    const user = await this.users.findOne({
      where: { id: userId, organizationId },
      relations: { organization: true },
    });
    if (!user) throw new UnauthorizedException();
    const { passwordHash: _ph, ...rest } = user;
    void _ph;
    return rest;
  }

  private async issueTokens(user: User, ip?: string): Promise<IssuedTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      org: user.organizationId,
      email: user.email,
      role: user.role,
    };
    const accessTtl = this.cfg.get<string>('JWT_ACCESS_TTL', '15m');
    const refreshTtl = this.cfg.get<string>('JWT_REFRESH_TTL', '30d');

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.cfg.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessTtl,
    });

    const refreshPlain = crypto.randomBytes(48).toString('hex');
    const refreshHash = this.hash(refreshPlain);

    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + this.ttlToMs(refreshTtl));

    await this.refresh.save(
      this.refresh.create({
        userId: user.id,
        tokenHash: refreshHash,
        expiresAt,
        ip: ip ?? null,
      }),
    );

    return {
      accessToken,
      refreshToken: refreshPlain,
      expiresIn: this.ttlToSec(accessTtl),
    };
  }

  private hash(s: string): string {
    return crypto.createHash('sha256').update(s).digest('hex');
  }

  private ttlToMs(ttl: string): number {
    return this.ttlToSec(ttl) * 1000;
  }

  private ttlToSec(ttl: string): number {
    const m = /^(\d+)([smhd])$/.exec(ttl);
    if (!m) throw new BadRequestException(`Bad TTL: ${ttl}`);
    const n = parseInt(m[1], 10);
    const unit = m[2];
    const factor = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
    return n * factor;
  }
}
