import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

import { QueryBus } from '@nestjs/cqrs';
import { TENANT_ID_HEADER } from '@/common/tenant';

import { Role } from '@/modules/auth/enum/role.enum';
import { FindTenantByNameQuery } from '@/modules/tenant/query/find-tenant-by-name.query';

import {
  TOKEN_SCOPE,
  TokenPayloadDto,
  TokenScope,
} from '../dto/token-payload.dto';
import { User } from '../entity/user.entity';
import { ValidatePublicAdminJwtQuery } from '../query/validate-public-admin-jwt.query';
import { ValidateJwtUserQuery } from '../query/validate-jwt-user.query';

export interface IJwtStrategy {
  id: string;
  role: Role;
  scope: TokenScope;
  tenantId?: string;
  user?: User;
  email?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly queryBus: QueryBus,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
      passReqToCallback: true,
    });
  }

  async validate(
    request: Request,
    payload: TokenPayloadDto,
  ): Promise<IJwtStrategy> {
    if (
      payload.scope !== TOKEN_SCOPE.management &&
      payload.scope !== TOKEN_SCOPE.tenant
    ) {
      throw new UnauthorizedException('Invalid token scope');
    }

    if (payload.scope === TOKEN_SCOPE.management) {
      const admin = await this.queryBus.execute(
        new ValidatePublicAdminJwtQuery(payload),
      );
      return {
        id: admin.id,
        email: admin.email,
        role: Role.ADMIN,
        scope: TOKEN_SCOPE.management,
      };
    }

    const headerValue = request.headers[TENANT_ID_HEADER];
    const tenantIdHeader = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;
    if (!tenantIdHeader?.trim()) {
      throw new UnauthorizedException(
        `${TENANT_ID_HEADER} is required for tenant requests`,
      );
    }

    if (tenantIdHeader !== payload.tenantId) {
      throw new UnauthorizedException('Invalid tenant id');
    }

    const user = await this.queryBus.execute(new ValidateJwtUserQuery(payload));
    await this.queryBus.execute(new FindTenantByNameQuery(payload.tenantId));

    return {
      id: user.id,
      user,
      role: user.role,
      tenantId: payload.tenantId,
      scope: TOKEN_SCOPE.tenant,
    };
  }
}
