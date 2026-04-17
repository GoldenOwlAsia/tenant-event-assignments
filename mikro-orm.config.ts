import { defineConfig } from '@mikro-orm/postgresql';

import { SchemaSeeder } from '@/database/seeders/schema.seeder';
import { getPublicSchema } from '@/common/tenant/public-schema';
import { mikroOrmConnectionOptions } from './mikro-orm.shared';

/**
 * Public-schema migrations (`src/database/migrations`): `public.tenant` + `public.public_admin`.
 * `schema` defaults to `public`; override with `PUBLIC_MIGRATION_SCHEMA` or `PUBLIC_SCHEMA`.
 */
export default defineConfig({
  ...mikroOrmConnectionOptions,
  schema: getPublicSchema(),
  migrations: {
    path: './dist/src/database/migrations',
    pathTs: './src/database/migrations',
  },
  seeder: {
    path: './src/database/seeders',
    defaultSeeder: SchemaSeeder.name,
  },
});
