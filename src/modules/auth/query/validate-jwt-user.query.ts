import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { User } from '../entity/user.entity';
import { EntityRepository } from '@mikro-orm/postgresql';
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
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
  ) {}

  async execute(query: ValidateJwtUserQuery): Promise<User> {
    const { sub, email, role } = query.payload;

    return await this.userRepository.findOneOrFail({
      id: sub,
      email,
      role,
    });
  }
}
