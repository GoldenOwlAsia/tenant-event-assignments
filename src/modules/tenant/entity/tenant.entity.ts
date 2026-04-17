import { Base } from '@/common/entity/base.entity';
import { getPublicSchema } from '@/common/tenant/public-schema';
import { Entity, Property } from '@mikro-orm/core';

@Entity({ schema: getPublicSchema(), tableName: 'tenant' })
export class Tenant extends Base {
  /** Normalized tenant / schema name (same rules as `sanitizedTenantName`). */
  @Property({ type: 'string', unique: true })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  /** Default From: address for mail sent on behalf of this tenant. */
  @Property({ type: 'string' })
  fromEmail!: string;

  @Property({ type: 'boolean', default: false })
  active!: boolean;
}
