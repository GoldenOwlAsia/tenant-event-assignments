import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { User } from '../entity/user.entity';
import { EntityRepository } from '@mikro-orm/postgresql';

export class FindUserByEmailQuery {
  constructor(public readonly email: string) {}
}

@QueryHandler(FindUserByEmailQuery)
export class FindUserByEmailHandler implements IQueryHandler<
  FindUserByEmailQuery,
  User
> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
  ) {}

  async execute(query: FindUserByEmailQuery): Promise<User> {
    return await this.userRepository.findOneOrFail({ email: query.email });
  }
}
