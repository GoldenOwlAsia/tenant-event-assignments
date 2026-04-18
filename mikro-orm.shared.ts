import * as dotenv from 'dotenv';

dotenv.config();

import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Event } from '@/modules/event/entities/event.entity';
import { EventFailureLog } from '@/modules/event/entities/event-failure-log.entity';
import { Admin } from '@/modules/auth/entity/admin.entity';
import { User } from '@/modules/auth/entity/user.entity';
import { Task } from '@/modules/task/entity/task.entity';
import { Tenant } from '@/modules/tenant/entity/tenant.entity';

export const mikroOrmPublicSchemaEntities = [Tenant, Admin];

export const mikroOrmTenantEntities = [
  Event,
  EventFailureLog,
  User,
  Task,
];

/** Nest runtime + `pnpm seed:database`: full metadata. */
export const mikroOrmEntities = [
  ...mikroOrmPublicSchemaEntities,
  ...mikroOrmTenantEntities,
];

export const mikroOrmPool = {
  min: 0,
  max: 10,
  acquireTimeoutMillis: 60000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 100,
};

export const mikroOrmConnectionOptions = {
  dbName: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  driver: PostgreSqlDriver,
  entities: mikroOrmEntities,
  debug: false,
  allowGlobalContext: true,
  pool: mikroOrmPool,
};
