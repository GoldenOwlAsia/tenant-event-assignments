import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ManagementScopeGuard } from '@/common/tenant';
import { RolesGuard } from '@/modules/auth/guard/role.guard';
import { CreateTenantHandler } from './command/create-tenant.command';
import { DeactivateTenantHandler } from './command/deactivate-tenant.command';
import { TenantController } from './tenant.controller';
import { FindTenantByNameHandler } from './query/find-tenant-by-name.query';
import { Tenant } from './entity/tenant.entity';

const tenantHandlers = [CreateTenantHandler, DeactivateTenantHandler];
const tenantQueries = [FindTenantByNameHandler];
@Module({
  imports: [CqrsModule, MikroOrmModule.forFeature([Tenant])],
  controllers: [TenantController],
  providers: [
    ...tenantHandlers,
    ...tenantQueries,
    ManagementScopeGuard,
    RolesGuard,
  ],
})
export class TenantModule {}
