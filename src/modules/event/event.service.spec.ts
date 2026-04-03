import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';
import { getQueueToken } from '@nestjs/bullmq';

import { EventService } from './event.service';
import { Event } from './entities/event.entity';
import { EventFailureLog } from './entities/event-failure-log.entity';
import { CreateEventDto } from './dto/create-event.dto';

describe('EventService', () => {
  let service: EventService;

  const mockEvent = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    tenantId: 'tenant-1',
    payload: { simulateFailure: false },
  };

  const mockEventRepository = {
    create: jest.fn().mockReturnValue(mockEvent),
  };

  const mockEm = {
    flush: jest.fn().mockResolvedValue(undefined),
  };

  const mockQueue = {
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
          provide: getQueueToken('event-queue'),
          useValue: mockQueue,
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
    it('creates an event, persists it, enqueues processing, and returns the event', async () => {
      const dto: CreateEventDto = {
        tenantId: 'tenant-1',
        payload: { simulateFailure: false },
      };
      mockEventRepository.create.mockReturnValueOnce(mockEvent);
      mockQueue.add.mockResolvedValueOnce({ id: 'job-1' });

      const result = await service.createEvent(dto);

      expect(mockEventRepository.create).toHaveBeenCalledWith(dto);
      expect(mockEm.flush).toHaveBeenCalledTimes(1);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-event',
        {
          eventId: mockEvent.id,
          tenantId: mockEvent.tenantId,
          payload: mockEvent.payload,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      );
      expect(result).toBe(mockEvent);
    });
  });

  describe('getEventFailureLogs', () => {
    it('returns failure logs for the tenant', async () => {
      const logs = [{ id: 'log-1', tenantId: 't1' }];
      mockEventFailureLogRepository.find.mockResolvedValueOnce(logs);

      const result = await service.getEventFailureLogs('t1');

      expect(mockEventFailureLogRepository.find).toHaveBeenCalledWith({
        tenantId: 't1',
      });
      expect(result).toBe(logs);
    });
  });
});
