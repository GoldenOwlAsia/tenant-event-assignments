import { MikroORM } from '@mikro-orm/postgresql';
import config from '../mikro-orm.config';
import { getTenantMikroOrmConfig } from '../mikro-orm.tenant.config';
import { mergePoolWithTenantSearchPath } from '../src/common/tenant/tenant-mikro-orm.pool';

async function run() {
  const orm = await MikroORM.init(config);

  const tenants = await orm.em.getConnection().execute(
    `SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT LIKE 'pg_%' 
      AND schema_name != 'information_schema'
      AND schema_name != 'public';`,
  );

  for (const row of tenants as { schema_name: string }[]) {
    const schemaName = row.schema_name;
    console.log(`Migrating ${schemaName}...`);

    const tenantOrm = await MikroORM.init({
      ...getTenantMikroOrmConfig(schemaName),
      pool: mergePoolWithTenantSearchPath(config.pool, schemaName),
    });

    await tenantOrm.migrator.up();
    await tenantOrm.close();
  }

  await orm.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
