import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ValidateUserQuery } from '../query/validate-user.query';
import { Role } from '@/common/enum/role.enum';

export interface ILocalStrategy {
  id: string;
  email: string;
  role: Role;
}

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly queryBus: QueryBus) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<ILocalStrategy> {
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
    };
  }
}
