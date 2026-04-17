import { defineConfig } from '@mikro-orm/postgresql';

import {
  mikroOrmConnectionOptions,
  mikroOrmTenantEntities,
} from './mikro-orm.shared';

/**
 * MikroORM config for **per-tenant schema** migrations (`src/database/migrations-tenant`).
 * Use when running `migrator.up()` for a tenant schema (create-tenant, migrate:tenants, etc.).
 */
export function getTenantMikroOrmConfig(schema: string) {
  return defineConfig({
    ...mikroOrmConnectionOptions,
    entities: mikroOrmTenantEntities,
    schema,
    migrations: {
      path: './dist/src/database/migrations-tenant',
      pathTs: './src/database/migrations-tenant',
    },
  });
}
