import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@mikro-orm/nestjs';

import { Task } from '../entity/task.entity';
import { User } from '@/modules/auth/entity/user.entity';
import { Role } from '@/modules/auth/enum/role.enum';
import { TaskStatus } from '@/modules/task/enum/task-status.enum';
import { IJwtStrategy } from '@/modules/auth/strategies/jwt.strategy';

import {
  FindAllTasksPaginatedHandler,
  FindAllTasksPaginatedQuery,
} from './find-all-tasks-paginated.query';

describe('FindAllTasksPaginatedHandler', () => {
  let handler: FindAllTasksPaginatedHandler;

  const reporterId = '550e8400-e29b-41d4-a716-446655440000';
  const assigneeId = '660e8400-e29b-41d4-a716-446655440001';
  const taskId = '770e8400-e29b-41d4-a716-446655440002';

  const mockReporter: Partial<User> = {
    id: reporterId,
    name: 'Reporter',
    email: 'reporter@example.com',
    role: Role.REPORTER,
  };

  const mockTaskRepository = {
    findAndCount: jest.fn(),
  };

  const jwtCtx = (id: string, role: Role): IJwtStrategy => {
    const user = { id, role, name: 'U', email: 'u@example.com' } as User;
    return { id, role, user, tenantId: 'public', scope: 'tenant' };
  };

  const query = { page: 2, pageSize: 5, search: 'bug' };

  const buildTask = (overrides: Partial<Task> = {}): Task =>
    ({
      id: taskId,
      title: 'Fix bug',
      taskStatus: TaskStatus.CREATED,
      reporter: mockReporter,
      assignedTo: null,
      dueDate: new Date('2026-01-01'),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Task;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindAllTasksPaginatedHandler,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
      ],
    }).compile();

    handler = module.get(FindAllTasksPaginatedHandler);
  });

  it('should filter by assignedTo and paginate for USER role', async () => {
    const tasks = [buildTask()];
    mockTaskRepository.findAndCount.mockResolvedValueOnce([tasks, 11]);

    const result = await handler.execute(
      new FindAllTasksPaginatedQuery(jwtCtx(assigneeId, Role.USER), query),
    );

    expect(mockTaskRepository.findAndCount).toHaveBeenCalledWith(
      {
        assignedTo: assigneeId,
        title: { $ilike: '%bug%' },
      },
      {
        limit: 5,
        offset: 5,
        orderBy: { createdAt: 'DESC' },
      },
    );
    expect(result.total).toBe(11);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(5);
    expect(result.totalPages).toBe(3);
    expect(result.data[0]).toMatchObject({
      title: 'Fix bug',
      assignedTo: null,
      reportTo: { id: reporterId, name: 'Reporter' },
    });
  });

  it('should not filter by assignee for REPORTER role', async () => {
    mockTaskRepository.findAndCount.mockResolvedValueOnce([[], 0]);

    await handler.execute(
      new FindAllTasksPaginatedQuery(jwtCtx(reporterId, Role.REPORTER), {
        page: 1,
        pageSize: 10,
        search: '',
      }),
    );

    expect(mockTaskRepository.findAndCount).toHaveBeenCalledWith(
      {},
      expect.any(Object),
    );
  });
});
