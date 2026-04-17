import { MikroORM } from '@mikro-orm/core';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { getTenantMikroOrmConfig } from '../../../../mikro-orm.tenant.config';

import { mergePoolWithTenantSearchPath } from '@/common/tenant/tenant-mikro-orm.pool';
import { sanitizedTenantName } from '@/common/tenant/tenant-schema.util';

export class MigrationTenantCommand {
  constructor(public readonly schemaName: string) {}
}

@CommandHandler(MigrationTenantCommand)
export class MigrationTenantHandler implements ICommandHandler<
  MigrationTenantCommand,
  void
> {
  constructor() {}

  async execute(command: MigrationTenantCommand): Promise<void> {
    const { schemaName } = command;

    const schema = sanitizedTenantName(schemaName);

    const tenantOrm = await MikroORM.init({
      ...getTenantMikroOrmConfig(schema),
      pool: mergePoolWithTenantSearchPath({ afterCreate: null }, schema),
    });

    await tenantOrm.migrator.up();
    await tenantOrm.close();
  }
}
