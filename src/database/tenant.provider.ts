import { Scope } from '@nestjs/common';
import { EntityManager, MikroORM } from '@mikro-orm/postgresql';
import { sanitizedTenantName } from '@/common/tenant/tenant-schema.util';

export const TENANT_EM = 'TENANT_EM';

// This provider is used to get the entity manager for the tenant
export const TenantEntityManagerProvider = {
  provide: TENANT_EM,
  scope: Scope.REQUEST,
  inject: [MikroORM, 'REQUEST'],
  useFactory: (orm: MikroORM, req: any): EntityManager => {
    const tenantId = req.tenantId;

    const schema = sanitizedTenantName(tenantId);

    // fork the entity manager to the tenant schema
    return orm.em.fork({
      schema,
    });
  },
};
