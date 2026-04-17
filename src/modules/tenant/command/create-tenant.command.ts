import { ConflictException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MikroORM } from '@mikro-orm/core';
import { getTenantMikroOrmConfig } from '../../../../mikro-orm.tenant.config';

import {
  mergePoolWithTenantSearchPath,
  quotePgIdent,
} from '@/common/tenant/tenant-mikro-orm.pool';
import { sanitizedTenantName } from '@/common/tenant/tenant-schema.util';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { Tenant } from '../entity/tenant.entity';

export class CreateTenantCommand {
  constructor(public readonly dto: CreateTenantDto) {}
}

@CommandHandler(CreateTenantCommand)
export class CreateTenantHandler implements ICommandHandler<
  CreateTenantCommand,
  void
> {
  constructor(
    @Inject(MikroORM)
    private readonly orm: MikroORM,
  ) {}

  async execute(command: CreateTenantCommand): Promise<void> {
    const schemaName = sanitizedTenantName(command.dto.name);

    const rows = await this.orm.em
      .getConnection()
      .execute(
        `SELECT 1 FROM information_schema.schemata WHERE schema_name = ? LIMIT 1`,
        [schemaName],
      );

    if (Array.isArray(rows) && rows.length > 0) {
      throw new ConflictException(
        `Tenant "${schemaName}" is already registered.`,
      );
    }

    await this.orm.em
      .getConnection()
      .execute(`CREATE SCHEMA ${quotePgIdent(schemaName)}`);

    const row = new Tenant();
    row.name = schemaName;
    row.fromEmail = command.dto.fromEmail.trim();
    row.active = true;
    await this.orm.em.persistAndFlush(row);

    const tenantOrm = await MikroORM.init({
      ...getTenantMikroOrmConfig(schemaName),
      pool: mergePoolWithTenantSearchPath({ afterCreate: null }, schemaName),
    });

    try {
      await tenantOrm.migrator.up();
    } finally {
      await tenantOrm.close();
    }
  }
}
