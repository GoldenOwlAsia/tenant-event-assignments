import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { MikroORM } from '@mikro-orm/core';

import { sanitizedTenantName } from '@/common/tenant/tenant-schema.util';
import { Tenant } from '../entity/tenant.entity';

export class FindTenantByNameQuery {
  constructor(public readonly name: string) {}
}

@QueryHandler(FindTenantByNameQuery)
export class FindTenantByNameHandler implements IQueryHandler<
  FindTenantByNameQuery,
  void
> {
  constructor(
    @Inject(MikroORM)
    private readonly orm: MikroORM,
  ) {}

  async execute(query: FindTenantByNameQuery): Promise<void> {
    const schemaName = sanitizedTenantName(query.name);

    const registered = await this.orm.em.findOne(Tenant, {
      name: schemaName,
    });
    if (registered) {
      return;
    }

    const rows = await this.orm.em
      .getConnection()
      .execute(
        `SELECT 1 FROM information_schema.schemata WHERE schema_name = ? LIMIT 1`,
        [schemaName],
      );

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new NotFoundException(`Tenant "${schemaName}" not found`);
    }
  }
}
