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
import { ClientsModule } from './modules/clients/clients.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
    TypeOrmModule.forRootAsync(typeOrmConfig),
    ScheduleModule.forRoot(),

    AuthModule,
    OrganizationsModule,
    UsersModule,
    SettingsModule,
    AuditModule,
    InvitationsModule,

    PricingModule,
    ClientsModule,
    CatalogModule,
    SubscriptionsModule,
    TasksModule,
    InvoicesModule,
    PaymentsModule,
    ComplianceModule,
    SchedulerModule,
    DashboardModule,
  ],
})
export class AppModule {}
