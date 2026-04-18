import { Base } from '@/common/entity/base.entity';
import { getPublicSchema } from '@/common/tenant/public-schema';
import { Exclude } from 'class-transformer';
import { BeforeCreate, Entity, Property } from '@mikro-orm/core';

import { generateWithBcrypt } from '@/common/utils/hash.util';
import { AUTH_SALT_ROUNDS } from '@/modules/auth/auth.constant';

/** Management (`public` schema) administrator — not a tenant user. */
@Entity({ schema: getPublicSchema(), tableName: 'admin' })
export class Admin extends Base {
  @Property({ type: 'string', unique: true })
  email!: string;

  @Property({ type: 'string' })
  name: string;

  @Property({ type: 'string', nullable: false })
  @Exclude()
  password!: string;

  @BeforeCreate()
  async hashPassword(): Promise<void> {
    this.password = await generateWithBcrypt({
      source: this.password,
      salt: AUTH_SALT_ROUNDS,
    });
  }
}
