import {
  Inject,
  Injectable,
  NestMiddleware,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';

import { Tenant } from '@/modules/tenant/entity/tenant.entity';

import { getRequestPath, isPublicManagementPath } from './public-api-path';
import { TENANT_ID_HEADER } from './tenant.constants';
import { sanitizedTenantName } from './tenant-schema.util';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    @Inject(MikroORM)
    private readonly orm: MikroORM,
  ) {}

  async use(req: any, _res: any, next: () => void) {
    if (isPublicManagementPath(getRequestPath(req))) {
      return next();
    }

    const rawHeader = req.headers[TENANT_ID_HEADER];
    const raw = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (!raw) {
      throw new UnauthorizedException(`${TENANT_ID_HEADER} header missing`);
    }

    const schemaName = sanitizedTenantName(String(raw));

    const tenant = await this.orm.em.findOne(Tenant, { name: schemaName });
    if (!tenant || !tenant.active) {
      throw new NotFoundException('Tenant not found');
    }

    req.tenantId = schemaName;

    next();
  }
}
