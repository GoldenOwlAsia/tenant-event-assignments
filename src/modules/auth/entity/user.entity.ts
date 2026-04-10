import { Base } from '@/common/entity/base.entity';
import { Exclude } from 'class-transformer';
import { BeforeCreate, Entity, Property } from '@mikro-orm/core';
import { Role } from '@/common/enum/role.enum';

import { generateWithBcrypt } from '@/common/utils/hash.helper';
import { AUTH_SALT_ROUNDS } from '@/common/constant/auth.constant';
import { UserDto } from '../dto/user.dto';

@Entity({ tableName: 'user' })
export class User extends Base {
  @Property({ type: 'string', unique: true })
  email!: string;

  @Property({ type: 'string' })
  name: string;

  @Property({ type: 'string', nullable: false })
  @Exclude()
  password!: string;

  @Property({ type: 'string', default: Role.USER, nullable: false })
  role: Role = Role.USER;

  @BeforeCreate()
  async setInsertingData(): Promise<void> {
    this.password = await generateWithBcrypt({
      source: this.password,
      salt: AUTH_SALT_ROUNDS,
    });
  }

  toDto(): UserDto {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
    };
  }
}
