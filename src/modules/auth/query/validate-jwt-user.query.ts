import { Inject, UnauthorizedException } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { MikroORM } from '@mikro-orm/core';

import { sanitizedTenantName } from '@/common/tenant/tenant-schema.util';

import { User } from '../entity/user.entity';
import { TokenPayloadDto } from '../dto/token-payload.dto';

export class ValidateJwtUserQuery {
  constructor(public readonly payload: TokenPayloadDto) {}
}

@QueryHandler(ValidateJwtUserQuery)
export class ValidateJwtUserHandler implements IQueryHandler<
  ValidateJwtUserQuery,
  User
> {
  constructor(
    @Inject(MikroORM)
    private readonly orm: MikroORM,
  ) {}

  async execute(query: ValidateJwtUserQuery): Promise<User> {
    const { sub, email, role, tenantId } = query.payload;
    if (!tenantId?.trim()) {
      throw new UnauthorizedException('Invalid token: missing tenant id');
    }
    const schema = sanitizedTenantName(tenantId);

    const em = this.orm.em.fork({ schema });
    return await em.findOneOrFail(User, {
      id: sub,
      email,
      role,
    });
  }
}
