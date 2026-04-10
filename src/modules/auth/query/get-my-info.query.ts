import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { User } from '../entity/user.entity';
import { EntityRepository } from '@mikro-orm/postgresql';
import { UserDto } from '../dto/user.dto';

export class GetMyInfoQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetMyInfoQuery)
export class GetMyInfoHandler implements IQueryHandler<
  GetMyInfoQuery,
  UserDto
> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
  ) {}

  async execute(query: GetMyInfoQuery): Promise<UserDto> {
    const user = await this.userRepository.findOneOrFail({ id: query.userId });
    return user.toDto();
  }
}
