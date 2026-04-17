import * as dotenv from 'dotenv';

dotenv.config();

import { MikroORM } from '@mikro-orm/postgresql';
import config from '../mikro-orm.config';
import { getTenantMikroOrmConfig } from '../mikro-orm.tenant.config';
import {
  mergePoolWithTenantSearchPath,
  quotePgIdent,
} from '../src/common/tenant/tenant-mikro-orm.pool';
import { sanitizedTenantName } from '../src/common/tenant/tenant-schema.util';
import { Tenant } from '../src/modules/tenant/entity/tenant.entity';
import { DatabaseSeeder } from '../src/database/seeders/database.seeder';
import { SchemaSeeder } from '../src/database/seeders/schema.seeder';

const demoTenant =
  process.env.SEED_DEMO_TENANT?.trim() ||
  process.env.DEMO_TENANT_SCHEMA?.trim() ||
  'demo';

async function ensureTenantSchemaAndRegistry(
  orm: MikroORM,
  tenantName: string,
  fromEmail: string,
): Promise<void> {
  const schemaName = sanitizedTenantName(tenantName);
  const existsRows = await orm.em.getConnection().execute(
    `SELECT 1 FROM information_schema.schemata WHERE schema_name = ? LIMIT 1`,
    [schemaName],
  );

  if (!Array.isArray(existsRows) || existsRows.length === 0) {
    await orm.em
      .getConnection()
      .execute(`CREATE SCHEMA ${quotePgIdent(schemaName)}`);
  }

  const tenantOrm = await MikroORM.init({
    ...getTenantMikroOrmConfig(schemaName),
    pool: mergePoolWithTenantSearchPath(config.pool, schemaName),
  });
  try {
    await tenantOrm.migrator.up();
  } finally {
    await tenantOrm.close();
  }

  const existing = await orm.em.findOne(Tenant, { name: schemaName });
  if (!existing) {
    orm.em.persist(
      orm.em.create(Tenant, {
        name: schemaName,
        fromEmail,
        active: true,
      }),
    );
    await orm.em.flush();
  }
}

async function run(): Promise<void> {
  const orm = await MikroORM.init(config);
  try {
    const fromEmail = process.env.MAIL_FROM?.trim() || 'noreply@localhost';
    await ensureTenantSchemaAndRegistry(orm, demoTenant, fromEmail);
    await new SchemaSeeder().run(orm.em);
    await new DatabaseSeeder().run(
      orm.em.fork({ schema: sanitizedTenantName(demoTenant) }),
    );
  } finally {
    await orm.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
