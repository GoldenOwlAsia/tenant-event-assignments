import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { QueryBus } from '@nestjs/cqrs';
import { ValidateJwtUserQuery } from '../query/validate-jwt-user.query';
import { TokenPayloadDto } from '../dto/token-payload.dto';
import { User } from '../entity/user.entity';
import { Role } from '@/common/enum/role.enum';

export interface IJwtStrategy {
  id: string;
  user: User;
  role: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly queryBus: QueryBus,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: TokenPayloadDto): Promise<IJwtStrategy> {
    const user = await this.queryBus.execute(new ValidateJwtUserQuery(payload));

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return {
      id: user.id,
      user: user,
      role: user.role,
    };
  }
}
