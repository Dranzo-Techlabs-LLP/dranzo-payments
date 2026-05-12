import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClsModule } from 'nestjs-cls';
import { ScheduleModule } from '@nestjs/schedule';

import { typeOrmConfig } from './config/typeorm.config';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { UsersModule } from './modules/users/users.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AuditModule } from './modules/audit/audit.module';
import { InvitationsModule } from './modules/invitations/invitations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    TypeOrmModule.forRootAsync(typeOrmConfig),
    ScheduleModule.forRoot(),

    AuthModule,
    OrganizationsModule,
    UsersModule,
    SettingsModule,
    AuditModule,
    InvitationsModule,
  ],
})
export class AppModule {}
