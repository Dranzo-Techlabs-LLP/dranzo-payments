import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { Role } from '../../common/enums/role.enum';

export interface JwtPayload {
  sub: string;
  org: string;
  email: string;
  role: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    cfg: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.users.findOne({
      where: { id: payload.sub, organizationId: payload.org },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or deactivated');
    }
    return {
      userId: user.id,
      organizationId: user.organizationId,
      email: user.email,
      role: user.role,
    };
  }
}
