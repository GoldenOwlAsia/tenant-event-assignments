import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { User } from '../entity/user.entity';
import { EntityRepository } from '@mikro-orm/postgresql';
import { PaginationQueryDto, PaginationResponseDto } from '@/common/dto/pagination.dto';
import { UserDto } from '../dto/user.dto';

export class FindAllUsersPaginatedQuery {
  constructor(public readonly query: PaginationQueryDto) {}
}

@QueryHandler(FindAllUsersPaginatedQuery)
export class FindAllUsersPaginatedHandler implements IQueryHandler<
  FindAllUsersPaginatedQuery,
  PaginationResponseDto<UserDto>
> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
  ) {}

  async execute(
    query: FindAllUsersPaginatedQuery,
  ): Promise<PaginationResponseDto<UserDto>> {
    const { page, pageSize, search } = query.query;
    const skip = (page - 1) * pageSize;
    const trimmedSearch = search?.trim();

    const where = trimmedSearch
      ? {
          $or: [
            { name: { $ilike: `%${trimmedSearch}%` } },
            { email: { $ilike: `%${trimmedSearch}%` } },
          ],
        }
      : {};

    const [users, total] = await this.userRepository.findAndCount(where, {
      limit: pageSize,
      offset: skip,
      orderBy: { createdAt: 'DESC' },
    });

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: users.map((u) => u.toDto()),
      total,
      page,
      pageSize,
      totalPages,
    };
  }
}
