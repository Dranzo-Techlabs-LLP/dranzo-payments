import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';

import { User } from '../../database/entities/user.entity';
import { Organization } from '../../database/entities/organization.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { Invitation } from '../../database/entities/invitation.entity';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Organization, RefreshToken, Invitation]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
