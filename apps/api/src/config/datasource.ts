// Standalone DataSource for the TypeORM CLI (migrations).
// The Nest runtime uses typeorm.config.ts; this file is only for the CLI.

import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { buildDataSourceOptions } from './typeorm.config';
import * as path from 'path';

loadEnv({ path: path.resolve(process.cwd(), '.env') });
loadEnv({ path: path.resolve(process.cwd(), '../../.env'), override: false });

const cfg = new ConfigService(process.env);

export default new DataSource(buildDataSourceOptions(cfg));
