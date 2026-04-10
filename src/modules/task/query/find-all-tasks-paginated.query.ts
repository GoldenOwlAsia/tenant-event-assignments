import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';

import { IJwtStrategy } from '@/modules/auth/strategies/jwt.strategy';
import { PaginationQueryDto, PaginationResponseDto } from '@/common/dto/pagination.dto';
import { Role } from '@/modules/auth/enum/role.enum';

import { Task } from '../entity/task.entity';
import { mapTaskToDto, TaskDto } from '../dto/task.dto';

export class FindAllTasksPaginatedQuery {
  constructor(
    public readonly user: IJwtStrategy,
    public readonly query: PaginationQueryDto,
  ) {}
}

@QueryHandler(FindAllTasksPaginatedQuery)
export class FindAllTasksPaginatedHandler implements IQueryHandler<
  FindAllTasksPaginatedQuery,
  PaginationResponseDto<TaskDto>
> {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: EntityRepository<Task>,
  ) {}

  async execute(
    q: FindAllTasksPaginatedQuery,
  ): Promise<PaginationResponseDto<TaskDto>> {
    const { id, role } = q.user;
    const { page, pageSize, search } = q.query;

    const skip = (page - 1) * pageSize;

    const queryOptions: { assignedTo?: string } = {};

    if (role === Role.USER) {
      queryOptions.assignedTo = id as string;
    }

    const [tasks, total] = await this.taskRepository.findAndCount(
      {
        ...queryOptions,
        ...(search ? { title: { $ilike: `%${search}%` } } : {}),
      },
      {
        populate: ['assignedTo', 'reporter'],
        limit: pageSize,
        offset: skip,
        orderBy: { createdAt: 'DESC' },
      },
    );

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: tasks.map((task) => mapTaskToDto(task)),
      total,
      page,
      pageSize,
      totalPages,
    };
  }
}
