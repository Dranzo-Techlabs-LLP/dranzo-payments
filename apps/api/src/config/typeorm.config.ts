import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import * as path from 'path';

export const buildDataSourceOptions = (cfg: ConfigService): DataSourceOptions => ({
  type: 'mysql',
  host: cfg.get<string>('DB_HOST'),
  port: parseInt(cfg.get<string>('DB_PORT', '3306'), 10),
  username: cfg.get<string>('DB_USER'),
  password: cfg.get<string>('DB_PASSWORD'),
  database: cfg.get<string>('DB_NAME'),
  charset: 'utf8mb4',
  timezone: 'Z',
  synchronize: cfg.get<string>('DB_SYNCHRONIZE') === 'true',
  logging: cfg.get<string>('DB_LOGGING') === 'true',
  entities: [path.join(__dirname, '..', 'database', 'entities', '*.entity.{ts,js}')],
  migrations: [path.join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
  migrationsTableName: 'typeorm_migrations',
  extra: {
    connectionLimit: 10,
    enableKeepAlive: true,
    keepAliveInitialDelay: 30_000,
    connectTimeout: 15_000,
    // strict mode enforced at MySQL server level — do not relax here
  },
});

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (cfg: ConfigService) => buildDataSourceOptions(cfg),
};
