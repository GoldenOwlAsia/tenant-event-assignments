import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { EventRepository } from './repository/event.repository';
import { InjectRepository } from '@mikro-orm/nestjs';

import { EntityManager } from '@mikro-orm/postgresql';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Event } from './entities/event.entity';
import { EventFailureLog } from './entities/event-failure-log.entity';
import { EventFailureLogRepository } from './repository/event-failure-log.repository';
import { EventStatus } from '@/modules/event/enum/event.enum';
import { QUEUE_CONFIG } from '@/modules/event/event.constant';
import { EventType } from '@/modules/event/enum/event.enum';
import { TASK_PROCESSING_QUEUE } from '@/modules/task/task.queue';
import { MAIL_PROCESSING_QUEUE } from '@/modules/mail/mail.queue';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: EventRepository,
    private readonly em: EntityManager,
    @InjectQueue(TASK_PROCESSING_QUEUE) private processEventQueue: Queue,
    @InjectQueue(MAIL_PROCESSING_QUEUE) private mailProcessingQueue: Queue,
    @InjectRepository(EventFailureLog)
    private readonly eventFailureLogRepository: EventFailureLogRepository,
  ) {}

  private async pushEventToQueue(
    createEventDto: CreateEventDto,
    eventId: string,
  ) {
    switch (createEventDto.event) {
      case EventType.TASK_CREATE:
        return await this.processEventQueue.add(
          createEventDto.event,
          {
            eventId,
            taskId: createEventDto.taskId,
            data: createEventDto.data,
          },
          QUEUE_CONFIG,
        );
      case EventType.MAIL_NOTIFICATION:
        return await this.mailProcessingQueue.add(
          createEventDto.event,
          {
            eventId,
            taskId: createEventDto.taskId,
            data: createEventDto.data,
          },
          QUEUE_CONFIG,
        );
      default:
        throw new BadRequestException('Invalid event type');
    }
  }

  async createTaskProcessingEvent(createEventDto: CreateEventDto) {
    const event = this.eventRepository.create({
      taskId: createEventDto.taskId,
      payload: createEventDto.data,
      status: EventStatus.PENDING,
    });

    await this.em.flush();

    this.logger.log(`Event created: ${event.id}`);

    // Push event to queue
    const job = await this.pushEventToQueue(createEventDto, event.id);

    this.logger.log(
      `Push to queue: ${job.name} for taskId: ${createEventDto.taskId}`,
    );
    return event;
  }

  async getEventFailureLogs(taskId: string) {
    return this.eventFailureLogRepository.find({
      event: {
        taskId: taskId,
      },
    });
  }
}
