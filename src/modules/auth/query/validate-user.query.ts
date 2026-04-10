import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { User } from '../entity/user.entity';
import { EntityRepository } from '@mikro-orm/postgresql';
import { UnauthorizedException } from '@nestjs/common';
import { compareWithBcrypt } from '@/common/utils/hash.util';

export class ValidateUserQuery {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}

@QueryHandler(ValidateUserQuery)
export class ValidateUserHandler implements IQueryHandler<
  ValidateUserQuery,
  User
> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
  ) {}

  async execute(query: ValidateUserQuery): Promise<User> {
    const user = await this.userRepository.findOneOrFail({
      email: query.email,
    });

    const isPasswordValid = await compareWithBcrypt({
      source: query.password,
      target: user.password,
    });

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }
}
