import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';
import { getQueueToken } from '@nestjs/bullmq';

import { EventService } from './event.service';
import { Event } from './entities/event.entity';
import { EventFailureLog } from './entities/event-failure-log.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { EventType } from '@/common/enum/event.enum';
import { PayLoadData, SendMailData } from './dto';
describe('EventService', () => {
  let service: EventService;

  const mockTaskEvent = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    tenantId: 'tenant-1',
    payload: { simulateFailure: false },
  };

  const mockMailEvent = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    tenantId: 'tenant-1',
    payload: { simulateFailure: false },
  };

  const mockEventRepository = {
    create: jest.fn(),
  };

  const mockEm = {
    flush: jest.fn().mockResolvedValue(undefined),
  };

  const mockQueueTask = {
    add: jest.fn(),
  };

  const mockQueueMail = {
    add: jest.fn(),
  };

  const mockEventFailureLogRepository = {
    find: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        {
          provide: getRepositoryToken(Event),
          useValue: mockEventRepository,
        },
        {
          provide: EntityManager,
          useValue: mockEm,
        },
        {
          provide: getQueueToken('task-processing-queue'),
          useValue: mockQueueTask,
        },
        {
          provide: getQueueToken('mail-processing-queue'),
          useValue: mockQueueMail,
        },
        {
          provide: getRepositoryToken(EventFailureLog),
          useValue: mockEventFailureLogRepository,
        },
      ],
    }).compile();

    service = module.get<EventService>(EventService);
  });

  describe('createEvent', () => {
    it('create task processing event', async () => {
      const bodyRequest: CreateEventDto = {
        taskId: 'task-1',
        event: EventType.TASK_CREATE,
        data: {
          reporterId: 'reporter-1',
          dueDate: new Date(),
          title: 'Task 1',
          description: 'Description 1',
        } as PayLoadData,
      };
      mockEventRepository.create.mockReturnValueOnce(mockTaskEvent);
      mockQueueTask.add.mockResolvedValueOnce({ id: 'job-1' });

      const result = await service.createTaskProcessingEvent(bodyRequest);

      expect(mockEventRepository.create).toHaveBeenCalledTimes(1);
      expect(mockEm.flush).toHaveBeenCalledTimes(1);
      expect(mockQueueTask.add).toHaveBeenCalled();
      expect(result).toBe(mockTaskEvent);
    });

    it('create mail notification event', async () => {
      const bodyRequest: CreateEventDto = {
        taskId: 'task-1',
        event: EventType.MAIL_NOTIFICATION,
        data: {
          to: 'test@example.com',
          subject: 'Test Subject',
          text: 'Test Text',
        } as SendMailData,
      };
      mockEventRepository.create.mockReturnValueOnce(mockMailEvent);
      mockQueueMail.add.mockResolvedValueOnce({ id: 'job-1' });

      const result = await service.createTaskProcessingEvent(bodyRequest);

      expect(mockEventRepository.create).toHaveBeenCalled();
      expect(result).toBe(mockMailEvent);
    });
  });

  describe('getEventFailureLogs', () => {
    it('returns failure logs for the tenant', async () => {
      const logs = [{ id: 'log-1', tenantId: 't1' }];
      mockEventFailureLogRepository.find.mockResolvedValueOnce(logs);

      const result = await service.getEventFailureLogs('t1');

      expect(result).toBe(logs);
    });
  });
});
