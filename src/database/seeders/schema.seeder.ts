import { EntityManager } from '@mikro-orm/postgresql';
import { Seeder } from '@mikro-orm/seeder';

import { PublicAdmin } from '@/modules/auth/entity/public-admin.entity';

const DEFAULT_ADMIN_EMAIL = 'admin@assignment.local';

export class SchemaSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const email = process.env.PUBLIC_ADMIN_EMAIL?.trim() || DEFAULT_ADMIN_EMAIL;
    const password = process.env.PUBLIC_ADMIN_PASSWORD?.trim() || 'Admin123!@#';
    const name =
      process.env.PUBLIC_ADMIN_NAME?.trim() || 'System Administrator';

    const existing = await em.findOne(PublicAdmin, { email });
    if (existing) {
      return;
    }

    em.persist(
      em.create(PublicAdmin, {
        email,
        name,
        password,
      }),
    );
    await em.flush();
  }
}
