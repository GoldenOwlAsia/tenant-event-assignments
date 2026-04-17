import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiParam, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CreateTenantCommand } from './command/create-tenant.command';
import { DeactivateTenantCommand } from './command/deactivate-tenant.command';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ManagementScopeGuard } from '@/common/tenant';
import { Roles } from '@/common/decorator/roles.decorator';
import { Role } from '../auth/enum/role.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@/modules/auth/guard/role.guard';

@Controller('tenant')
@ApiTags('Tenant')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiSecurity('bearer')
export class TenantController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @UseGuards(ManagementScopeGuard)
  @Roles([Role.ADMIN])
  async createAndMigrateTenant(
    @Body() dto: CreateTenantDto,
  ): Promise<{ message: string }> {
    await this.commandBus.execute(new CreateTenantCommand(dto));
    return { message: 'Tenant created and migrated successfully' };
  }

  @Delete(':name')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ManagementScopeGuard)
  @Roles([Role.ADMIN])
  @ApiParam({
    name: 'name',
    description:
      'Tenant identifier (normalized like create); registry row `active` is set to false.',
  })
  deactivateTenant(@Param('name') name: string): Promise<void> {
    return this.commandBus.execute(new DeactivateTenantCommand(name));
  }
}
