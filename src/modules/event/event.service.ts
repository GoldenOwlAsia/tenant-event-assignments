import { Injectable, Logger } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { EventRepository } from './repository/event.repository';
import { InjectRepository } from '@mikro-orm/nestjs';

import { EntityManager } from '@mikro-orm/postgresql';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Event } from './entities/event.entity';
import { EventFailureLog } from './entities/event-failure-log.entity';
import { EventFailureLogRepository } from './repository/event-failure-log.repository';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: EventRepository,
    private readonly em: EntityManager,
    @InjectQueue('event-queue') private processEventQueue: Queue,
    @InjectRepository(EventFailureLog)
    private readonly eventFailureLogRepository: EventFailureLogRepository,
  ) {}

  async createEvent(createEventDto: CreateEventDto) {
    const event = this.eventRepository.create(createEventDto);

    await this.em.flush();

    this.logger.log(`Event created: ${event.id}`);

    // Push event to queue
    const job = await this.processEventQueue.add(
      'process-event',
      {
        eventId: event.id,
        tenantId: event.tenantId,
        payload: event.payload,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );

    this.logger.log(`Push to queue: ${job.id}`);
    return event;
  }

  async getEventFailureLogs(tenantId: string) {
    return this.eventFailureLogRepository.find({
      tenantId,
    });
  }
}
