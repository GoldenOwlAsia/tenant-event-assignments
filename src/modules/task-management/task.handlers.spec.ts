import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { Task } from './entity/task.entity';
import { User } from '@/modules/auth/entity/user.entity';
import { Role } from '@/common/enum/role.enum';
import { TaskStatus } from '@/common/enum/status.enum';
import { TaskAction } from '@/common/enum/action.enum';
import { IJwtStrategy } from '@/modules/auth/strategies/jwt.strategy';
import { EventService } from '@/modules/event/event.service';
import { EventType } from '@/common/enum/event.enum';

import {
  FindAllTasksPaginatedHandler,
  FindAllTasksPaginatedQuery,
} from './query/find-all-tasks-paginated.query';
import {
  CreateTaskHandler,
  CreateTaskCommand,
} from './command/create-task.command';
import {
  TaskActionHandler,
  TaskActionCommand,
} from './command/task-action.command';

jest.mock('uuid', () => ({
  v4: jest.fn(() => '770e8400-e29b-41d4-a716-446655440002'),
}));

describe('Task CQRS handlers', () => {
  let findAllHandler: FindAllTasksPaginatedHandler;
  let createHandler: CreateTaskHandler;
  let actionHandler: TaskActionHandler;

  const reporterId = '550e8400-e29b-41d4-a716-446655440000';
  const assigneeId = '660e8400-e29b-41d4-a716-446655440001';
  const taskId = '770e8400-e29b-41d4-a716-446655440002';

  const mockReporter: Partial<User> = {
    id: reporterId,
    name: 'Reporter',
    email: 'reporter@example.com',
    role: Role.REPORTER,
  };

  const mockAssignee: Partial<User> = {
    id: assigneeId,
    name: 'Assignee',
    email: 'assignee@example.com',
    role: Role.USER,
  };

  const mockTaskRepository = {
    findAndCount: jest.fn(),
    findOneOrFail: jest.fn(),
  };

  const mockUserRepository = {
    findOneOrFail: jest.fn(),
  };

  const mockEm = {
    persist: jest.fn().mockReturnThis(),
    flush: jest.fn().mockResolvedValue(undefined),
  };

  const mockEventService = {
    createTaskProcessingEvent: jest.fn().mockResolvedValue(undefined),
  };

  const jwtCtx = (id: string, role: Role): IJwtStrategy => {
    const user = { id, role, name: 'U', email: 'u@example.com' } as User;
    return { id, role, user };
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockEm.persist.mockReturnThis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindAllTasksPaginatedHandler,
        CreateTaskHandler,
        TaskActionHandler,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: EntityManager,
          useValue: mockEm,
        },
        {
          provide: EventService,
          useValue: mockEventService,
        },
      ],
    }).compile();

    findAllHandler = module.get(FindAllTasksPaginatedHandler);
    createHandler = module.get(CreateTaskHandler);
    actionHandler = module.get(TaskActionHandler);
  });

  describe('FindAllTasksPaginatedHandler', () => {
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

    it('for USER role filters by assignedTo and paginates', async () => {
      const tasks = [buildTask()];
      mockTaskRepository.findAndCount.mockResolvedValueOnce([tasks, 11]);

      const result = await findAllHandler.execute(
        new FindAllTasksPaginatedQuery(jwtCtx(assigneeId, Role.USER), query),
      );

      expect(mockTaskRepository.findAndCount).toHaveBeenCalledWith(
        {
          assignedTo: assigneeId,
          title: { $ilike: '%bug%' },
        },
        {
          populate: ['assignedTo', 'reporter'],
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

    it('for REPORTER role does not filter by assignee', async () => {
      mockTaskRepository.findAndCount.mockResolvedValueOnce([[], 0]);

      await findAllHandler.execute(
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

  describe('CreateTaskHandler', () => {
    const dueDate = new Date('2026-06-01');
    const createDto = {
      title: 'New task',
      description: 'Desc',
      dueDate,
    };

    it('emits task create event and returns pending message', async () => {
      const result = await createHandler.execute(
        new CreateTaskCommand(reporterId, createDto),
      );

      expect(mockEventService.createTaskProcessingEvent).toHaveBeenCalledTimes(
        1,
      );
      expect(mockEventService.createTaskProcessingEvent).toHaveBeenCalledWith({
        event: EventType.TASK_CREATE,
        taskId,
        data: { ...createDto, taskId, reporterId },
      });
      expect(result).toEqual({
        message:
          'Task is under create, you will be notified by email when it is created',
      });
    });
  });

  describe('TaskActionHandler', () => {
    const assignBody = { userId: assigneeId };

    const buildTask = (status: TaskStatus, assigned?: Partial<User> | null) =>
      ({
        id: taskId,
        title: 'T',
        taskStatus: status,
        reporter: mockReporter,
        assignedTo: assigned ?? null,
      }) as Task;

    it('throws Forbidden when role is not allowed', async () => {
      mockTaskRepository.findOneOrFail.mockResolvedValueOnce(
        buildTask(TaskStatus.CREATED),
      );

      await expect(
        actionHandler.execute(
          new TaskActionCommand(
            jwtCtx(assigneeId, Role.USER),
            taskId,
            TaskAction.ASSIGN,
            assignBody,
          ),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockEm.flush).not.toHaveBeenCalled();
    });

    it('throws BadRequest when transition to ASSIGNED requires userId but it is missing', async () => {
      mockTaskRepository.findOneOrFail.mockResolvedValueOnce(
        buildTask(TaskStatus.CREATED),
      );

      await expect(
        actionHandler.execute(
          new TaskActionCommand(
            jwtCtx(reporterId, Role.REPORTER),
            taskId,
            TaskAction.ASSIGN,
            {} as { userId?: string },
          ),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ASSIGN from CREATED assigns user and updates status', async () => {
      const task = buildTask(TaskStatus.CREATED);
      mockTaskRepository.findOneOrFail.mockResolvedValueOnce(task);
      mockUserRepository.findOneOrFail
        .mockResolvedValueOnce(mockAssignee)
        .mockResolvedValueOnce(mockAssignee);

      const result = await actionHandler.execute(
        new TaskActionCommand(
          jwtCtx(reporterId, Role.REPORTER),
          taskId,
          TaskAction.ASSIGN,
          assignBody,
        ),
      );

      expect(mockUserRepository.findOneOrFail).toHaveBeenCalledWith({
        id: assigneeId,
      });
      expect(task.assignedTo).toBe(mockAssignee);
      expect(task.taskStatus).toBe(TaskStatus.ASSIGNED);
      expect(mockEm.persist).toHaveBeenCalledWith(task);
      expect(mockEm.flush).toHaveBeenCalledTimes(1);
      expect(result.taskStatus).toBe(TaskStatus.ASSIGNED);
      expect(mockEventService.createTaskProcessingEvent).toHaveBeenCalledWith({
        event: EventType.MAIL_NOTIFICATION,
        taskId: task.id,
        data: {
          to: mockAssignee.email,
          subject: `Task: ${task.title}`,
          text: `Hi ${mockAssignee.name}, Notification for task "${task.title}" (id: ${task.id}). You have been assigned to the task.`,
        },
      });
    });

    it('START from ASSIGNED moves to IN_PROGRESS for USER', async () => {
      const task = buildTask(TaskStatus.ASSIGNED, mockAssignee);
      mockTaskRepository.findOneOrFail.mockResolvedValueOnce(task);

      const result = await actionHandler.execute(
        new TaskActionCommand(
          jwtCtx(assigneeId, Role.USER),
          taskId,
          TaskAction.START,
          {},
        ),
      );

      expect(task.taskStatus).toBe(TaskStatus.IN_PROGRESS);
      expect(result.taskStatus).toBe(TaskStatus.IN_PROGRESS);
      expect(mockUserRepository.findOneOrFail).not.toHaveBeenCalled();
      expect(mockEventService.createTaskProcessingEvent).not.toHaveBeenCalled();
    });

    it('UNASSIGN from ASSIGNED returns task to CREATED for REPORTER', async () => {
      const task = buildTask(TaskStatus.ASSIGNED, mockAssignee);
      mockTaskRepository.findOneOrFail.mockResolvedValueOnce(task);

      await actionHandler.execute(
        new TaskActionCommand(
          jwtCtx(reporterId, Role.REPORTER),
          taskId,
          TaskAction.UNASSIGN,
          {},
        ),
      );

      expect(task.taskStatus).toBe(TaskStatus.CREATED);
      expect(mockEventService.createTaskProcessingEvent).not.toHaveBeenCalled();
    });

    it('REQUEST_REVIEW from IN_PROGRESS notifies reporter by email', async () => {
      const task = buildTask(TaskStatus.IN_PROGRESS, mockAssignee);
      mockTaskRepository.findOneOrFail.mockResolvedValueOnce(task);
      mockUserRepository.findOneOrFail.mockResolvedValueOnce(mockReporter);

      await actionHandler.execute(
        new TaskActionCommand(
          jwtCtx(assigneeId, Role.USER),
          taskId,
          TaskAction.REQUEST_REVIEW,
          {},
        ),
      );

      expect(task.taskStatus).toBe(TaskStatus.PENDING_REVIEW);
      expect(mockEventService.createTaskProcessingEvent).toHaveBeenCalledWith({
        event: EventType.MAIL_NOTIFICATION,
        taskId: task.id,
        data: {
          to: mockReporter.email,
          subject: `Task: ${task.title}`,
          text: `Hi ${mockReporter.name}, Notification for task "${task.title}" (id: ${task.id}). Please review the task.`,
        },
      });
    });
  });
});
