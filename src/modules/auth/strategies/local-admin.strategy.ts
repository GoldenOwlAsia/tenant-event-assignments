import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { QueryBus } from '@nestjs/cqrs';
import { Strategy } from 'passport-local';

import { ValidatePublicAdminQuery } from '../query/validate-public-admin.query';
import { IAdminLocalStrategy } from '../command/admin-login.command';

@Injectable()
export class LocalAdminStrategy extends PassportStrategy(Strategy, 'admin') {
  constructor(private readonly queryBus: QueryBus) {
    super({ usernameField: 'email', passwordField: 'password' });
  }

  async validate(
    email: string,
    password: string,
  ): Promise<IAdminLocalStrategy> {
    const admin = await this.queryBus.execute(
      new ValidatePublicAdminQuery(email, password),
    );
    return { id: admin.id, email: admin.email };
  }
}
