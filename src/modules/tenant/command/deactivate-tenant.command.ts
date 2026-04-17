import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MikroORM } from '@mikro-orm/core';

import { Tenant } from '../entity/tenant.entity';
import { sanitizedTenantName } from '@/common/tenant/tenant-schema.util';

export class DeactivateTenantCommand {
  constructor(public readonly name: string) {}
}

@CommandHandler(DeactivateTenantCommand)
export class DeactivateTenantHandler implements ICommandHandler<
  DeactivateTenantCommand,
  void
> {
  constructor(
    @Inject(MikroORM)
    private readonly orm: MikroORM,
  ) {}

  async execute(command: DeactivateTenantCommand): Promise<void> {
    const schemaName = sanitizedTenantName(command.name);
    const tenant = await this.orm.em.findOne(Tenant, { name: schemaName });

    if (!tenant) {
      throw new NotFoundException(`Tenant "${schemaName}" not found`);
    }
    tenant.active = false;
    await this.orm.em.flush();
  }
}
