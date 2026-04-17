import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';

import { User } from '@/modules/auth/entity/user.entity';
import { Role } from '@/modules/auth/enum/role.enum';
import { IJwtStrategy } from '@/modules/auth/strategies/jwt.strategy';
import { EventService } from '@/modules/event/event.service';
import { EventType } from '@/modules/event/enum/event.enum';
import { TaskAction } from '@/modules/task/enum/action.enum';
import { TaskStatus } from '@/modules/task/enum/task-status.enum';

import { Task } from '../entity/task.entity';
import { CreateTaskHandler, CreateTaskCommand } from './create-task.command';
import { TaskActionHandler, TaskActionCommand } from './task-action.command';

const commandSpecIds = {
  reporterId: '550e8400-e29b-41d4-a716-446655440000',
  assigneeId: '660e8400-e29b-41d4-a716-446655440001',
  taskId: '770e8400-e29b-41d4-a716-446655440002',
} as const;

function createMockEventService() {
  return {
    createTaskProcessingEvent: jest.fn().mockResolvedValue(undefined),
  };
}

function mockReporterUser(): Partial<User> {
  return {
    id: commandSpecIds.reporterId,
    name: 'Reporter',
    email: 'reporter@example.com',
    role: Role.REPORTER,
  };
}

function mockAssigneeUser(): Partial<User> {
  return {
    id: commandSpecIds.assigneeId,
    name: 'Assignee',
    email: 'assignee@example.com',
    role: Role.USER,
  };
}

function jwtStrategyContext(id: string, role: Role): IJwtStrategy {
  const user = { id, role, name: 'U', email: 'u@example.com' } as User;
  return { id, role, user, tenantId: 'public', scope: 'tenant' };
}

function createMockTaskRepository() {
  return {
    findOneOrFail: jest.fn(),
  };
}

function createMockUserRepository() {
  return {
    findOneOrFail: jest.fn(),
  };
}

function createMockEntityManager() {
  return {
    persist: jest.fn().mockReturnThis(),
    flush: jest.fn().mockResolvedValue(undefined),
  };
}

function buildTaskFixture(
  reporter: Partial<User>,
  status: TaskStatus,
  assigned?: Partial<User> | null,
): Task {
  return {
    id: commandSpecIds.taskId,
    title: 'T',
    taskStatus: status,
    reporter,
    assignedTo: assigned ?? null,
  } as Task;
}

const assignBody = { userId: commandSpecIds.assigneeId };

jest.mock('uuid', () => ({
  v4: jest.fn(() => '770e8400-e29b-41d4-a716-446655440002'),
}));

describe('CreateTaskHandler', () => {
  let handler: CreateTaskHandler;
  let mockEventService: ReturnType<typeof createMockEventService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockEventService = createMockEventService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateTaskHandler,
        {
          provide: EventService,
          useValue: mockEventService,
        },
      ],
    }).compile();

    handler = module.get(CreateTaskHandler);
  });

  it('should emit task create event and return pending message', async () => {
    const dueDate = new Date('2026-06-01');
    const createDto = {
      title: 'New task',
      description: 'Desc',
      dueDate,
    };

    const result = await handler.execute(
      new CreateTaskCommand(
        jwtStrategyContext(commandSpecIds.reporterId, Role.REPORTER),
        createDto,
      ),
    );

    expect(mockEventService.createTaskProcessingEvent).toHaveBeenCalledTimes(1);
    expect(mockEventService.createTaskProcessingEvent).toHaveBeenCalledWith({
      tenantId: 'public',
      event: EventType.TASK_CREATE,
      taskId: commandSpecIds.taskId,
      data: {
        ...createDto,
        taskId: commandSpecIds.taskId,
        reporterId: commandSpecIds.reporterId,
      },
    });
    expect(result).toEqual({
      message:
        'Task is under create, you will be notified by email when it is created',
    });
  });
});

describe('TaskActionHandler', () => {
  let handler: TaskActionHandler;
  let mockTaskRepository: ReturnType<typeof createMockTaskRepository>;
  let mockUserRepository: ReturnType<typeof createMockUserRepository>;
  let mockEm: ReturnType<typeof createMockEntityManager>;
  let mockEventService: ReturnType<typeof createMockEventService>;

  const mockReporter = mockReporterUser();
  const mockAssignee = mockAssigneeUser();

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTaskRepository = createMockTaskRepository();
    mockUserRepository = createMockUserRepository();
    mockEm = createMockEntityManager();
    mockEm.persist.mockReturnThis();
    mockEventService = createMockEventService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
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

    handler = module.get(TaskActionHandler);
  });

  it('should throw Forbidden when role is not allowed', async () => {
    mockTaskRepository.findOneOrFail.mockResolvedValueOnce(
      buildTaskFixture(mockReporter, TaskStatus.CREATED),
    );

    await expect(
      handler.execute(
        new TaskActionCommand(
          jwtStrategyContext(commandSpecIds.assigneeId, Role.USER),
          commandSpecIds.taskId,
          TaskAction.ASSIGN,
          assignBody,
        ),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mockEm.flush).not.toHaveBeenCalled();
  });

  it('should throw BadRequest when transition to ASSIGNED requires userId but it is missing', async () => {
    mockTaskRepository.findOneOrFail.mockResolvedValueOnce(
      buildTaskFixture(mockReporter, TaskStatus.CREATED),
    );

    await expect(
      handler.execute(
        new TaskActionCommand(
          jwtStrategyContext(commandSpecIds.reporterId, Role.REPORTER),
          commandSpecIds.taskId,
          TaskAction.ASSIGN,
          {} as { userId?: string },
        ),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should assign user and update status when ASSIGN from CREATED', async () => {
    const task = buildTaskFixture(mockReporter, TaskStatus.CREATED);
    mockTaskRepository.findOneOrFail.mockResolvedValueOnce(task);
    mockUserRepository.findOneOrFail.mockResolvedValue(mockAssignee);

    const result = await handler.execute(
      new TaskActionCommand(
        jwtStrategyContext(commandSpecIds.reporterId, Role.REPORTER),
        commandSpecIds.taskId,
        TaskAction.ASSIGN,
        assignBody,
      ),
    );

    expect(mockUserRepository.findOneOrFail).toHaveBeenCalledWith({
      id: commandSpecIds.assigneeId,
    });
    expect(task.assignedTo).toBe(mockAssignee);
    expect(task.taskStatus).toBe(TaskStatus.ASSIGNED);
    expect(mockEm.persist).toHaveBeenCalledWith(task);
    expect(mockEm.flush).toHaveBeenCalledTimes(1);
    expect(result.taskStatus).toBe(TaskStatus.ASSIGNED);
    expect(mockEventService.createTaskProcessingEvent).toHaveBeenCalledWith({
      tenantId: 'public',
      event: EventType.MAIL_NOTIFICATION,
      taskId: task.id,
      data: {
        to: mockAssignee.email,
        subject: `Tenant public - Task: ${task.title}`,
        text: `Hi ${mockAssignee.name}, Notification for task "${task.title}" (id: ${task.id}). You have been assigned to the task.`,
      },
    });
  });

  it('should move to IN_PROGRESS for USER when START from ASSIGNED', async () => {
    const task = buildTaskFixture(
      mockReporter,
      TaskStatus.ASSIGNED,
      mockAssignee,
    );
    mockTaskRepository.findOneOrFail.mockResolvedValueOnce(task);

    const result = await handler.execute(
      new TaskActionCommand(
        jwtStrategyContext(commandSpecIds.assigneeId, Role.USER),
        commandSpecIds.taskId,
        TaskAction.START,
        {},
      ),
    );

    expect(task.taskStatus).toBe(TaskStatus.IN_PROGRESS);
    expect(result.taskStatus).toBe(TaskStatus.IN_PROGRESS);
    expect(mockUserRepository.findOneOrFail).not.toHaveBeenCalled();
    expect(mockEventService.createTaskProcessingEvent).not.toHaveBeenCalled();
  });

  it('should return task to CREATED for REPORTER when UNASSIGN from ASSIGNED', async () => {
    const task = buildTaskFixture(
      mockReporter,
      TaskStatus.ASSIGNED,
      mockAssignee,
    );
    mockTaskRepository.findOneOrFail.mockResolvedValueOnce(task);

    await handler.execute(
      new TaskActionCommand(
        jwtStrategyContext(commandSpecIds.reporterId, Role.REPORTER),
        commandSpecIds.taskId,
        TaskAction.UNASSIGN,
        {},
      ),
    );

    expect(task.taskStatus).toBe(TaskStatus.CREATED);
    expect(mockEventService.createTaskProcessingEvent).not.toHaveBeenCalled();
  });

  it('should notify reporter by email when REQUEST_REVIEW from IN_PROGRESS', async () => {
    const task = buildTaskFixture(
      mockReporter,
      TaskStatus.IN_PROGRESS,
      mockAssignee,
    );
    mockTaskRepository.findOneOrFail.mockResolvedValueOnce(task);
    mockUserRepository.findOneOrFail.mockResolvedValueOnce(mockReporter);

    await handler.execute(
      new TaskActionCommand(
        jwtStrategyContext(commandSpecIds.assigneeId, Role.USER),
        commandSpecIds.taskId,
        TaskAction.REQUEST_REVIEW,
        {},
      ),
    );

    expect(task.taskStatus).toBe(TaskStatus.PENDING_REVIEW);
    expect(mockEventService.createTaskProcessingEvent).toHaveBeenCalledWith({
      tenantId: 'public',
      event: EventType.MAIL_NOTIFICATION,
      taskId: task.id,
      data: {
        to: mockReporter.email,
        subject: `Tenant public - Task: ${task.title}`,
        text: `Hi ${mockReporter.name}, Notification for task "${task.title}" (id: ${task.id}). Please review the task.`,
      },
    });
  });
});
