import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { Request } from 'express';
import { ValidateUserQuery } from '../query/validate-user.query';
import { Role } from '@/modules/auth/enum/role.enum';
import { TENANT_ID_HEADER } from '@/common/tenant/tenant.constants';

export interface ILocalStrategy {
  id: string;
  email: string;
  role: Role;
  tenantId: string;
}

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly queryBus: QueryBus) {
    super({
      usernameField: 'email',
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    email: string,
    password: string,
  ): Promise<ILocalStrategy> {
    const headerValue = req.headers[TENANT_ID_HEADER];
    const tenantId = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (!tenantId?.trim()) {
      throw new UnauthorizedException(
        `Tenant login requires the "${TENANT_ID_HEADER}" header with the tenant you are signing in to.`,
      );
    }

    const user = await this.queryBus.execute(
      new ValidateUserQuery(email, password),
    );

    if (!user) {
      throw new UnauthorizedException('Can not find user');
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId,
    };
  }
}
