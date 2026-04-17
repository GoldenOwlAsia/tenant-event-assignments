import { MikroORM } from '@mikro-orm/postgresql';
import config from '../mikro-orm.config';
import { DatabaseSeeder } from '@/database/seeders/database.seeder';

async function run() {
  const orm = await MikroORM.init(config);

  const schema = process.argv[2];

  if (schema) {
    console.log(`Seeding for tenant: ${schema}`);
    await seedOne(orm, schema);
  } else {
    throw new Error('Please provide tenant name: ex: `pnpm seed:tenant public`');
  }

  await orm.close();
}

async function seedOne(orm: MikroORM, schema: string) {
  const seeder = new DatabaseSeeder();

  const em = orm.em.fork({ schema });

  await seeder.run(em);
}

run();
