import { Injectable, Logger } from '@nestjs/common';
import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { EntityManager } from '@mikro-orm/postgresql';

import { Event } from '@/modules/event/entities/event.entity';
import { EventFailureLog } from '@/modules/event/entities/event-failure-log.entity';
import { EventPayload } from '@/modules/event/dto';
import { EventStatus, EventType } from '@/modules/event/enum/event.enum';
import { QUEUE_CONFIG } from '@/modules/event/event.constant';
import { TaskStatus } from '@/modules/task/enum/task-status.enum';
import { Task } from '@/modules/task/entity/task.entity';
import { User } from '@/modules/auth/entity/user.entity';
import { MAIL_PROCESSING_QUEUE } from '@/modules/mail/mail.queue';
import { TASK_PROCESSING_QUEUE } from './task.queue';
import { sanitizedTenantName } from '@/common/tenant';

@Processor(TASK_PROCESSING_QUEUE, { lockDuration: 30000 })
@Injectable()
export class TaskProcessor extends WorkerHost {
  private readonly logger = new Logger(TaskProcessor.name);

  constructor(
    private readonly em: EntityManager,
    @InjectQueue(MAIL_PROCESSING_QUEUE) private readonly mailQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<EventPayload>): Promise<void> {
    const schema = sanitizedTenantName(job.data.tenantId);
    const fork = this.em.fork({ schema });
    const { eventId, taskId, data } = job.data;
    this.logger.log(`Processing job: taskId: ${taskId}`);

    const eventRepo = fork.getRepository(Event);
    const userRepo = fork.getRepository(User);
    const taskRepo = fork.getRepository(Task);

    if (!data || !('taskId' in data)) {
      this.logger.error(`[task] invalid data: ${JSON.stringify(data)}`);
      throw new Error('Invalid data');
    }

    await eventRepo.nativeUpdate(eventId, {
      status: EventStatus.PROCESSING,
    });

    try {
      const reporter = await userRepo.findOneOrFail({ id: data.reporterId });

      const task = taskRepo.create({
        id: data.taskId,
        taskStatus: TaskStatus.CREATED,
        reporter: reporter,
        dueDate: data.dueDate,
        title: data.title,
        description: data.description,
      });

      fork.persist(task);
      await fork.flush();

      await this.mailQueue.add(
        EventType.MAIL_NOTIFICATION,
        {
          eventId: job.data.eventId,
          taskId: job.data.taskId,
          tenantId: job.data.tenantId,
          data: {
            to: reporter.email,
            subject: `Tenant ${schema} - Task ${task.title} create success`,
            text: `Hi ${reporter.name}, Task ${task.title}(taskId: ${task.id}) has been created successfully`,
          },
        } as EventPayload,
        QUEUE_CONFIG,
      );
    } catch (error: unknown) {
      this.logger.error(`[task] error: ${error}`);
      throw error;
    }

    await eventRepo.nativeUpdate(eventId, {
      status: EventStatus.COMPLETED,
    });
    await fork.flush();
  }

  @OnWorkerEvent('ready')
  onReady(): void {
    this.logger.log('Task worker is ready and listening...');
  }

  @OnWorkerEvent('error')
  onError(err: Error): void {
    this.logger.error('Task worker error:', err);
  }

  @OnWorkerEvent('failed')
  async onFailed(
    job: Job<EventPayload> | undefined,
    err: Error,
  ): Promise<void> {
    if (!job) return;

    const schema = sanitizedTenantName(job.data.tenantId);
    const fork = this.em.fork({ schema });
    const eventRepository = fork.getRepository(Event);
    const eventFailureLogRepository = fork.getRepository(EventFailureLog);

    const event = await eventRepository.findOneOrFail({
      id: job.data.eventId,
    });

    eventFailureLogRepository.create({
      event: event,
      attempt: job.attemptsMade,
      jobId: job.id,
    });

    await fork.flush();
    this.logger.warn(
      `Failed job, taskId: ${job.data.taskId}, attempt:${job.attemptsMade}, message: ${err.message}`,
    );

    const isFinal = job.attemptsMade >= job.opts.attempts;

    if (isFinal) {
      const eventRepo = fork.getRepository(Event);
      const userRepo = fork.getRepository(User);

      await eventRepo.nativeUpdate(job.data.eventId, {
        status: EventStatus.FAILED,
      });

      if (job.data.data && 'reporterId' in job.data.data) {
        const recipient = await userRepo.findOneOrFail({
          id: job.data.data?.reporterId,
        });

        this.logger.warn(
          `[task] Moved to DLQ: jobId=${job.id}, taskId=${job.data.taskId}`,
        );

        await this.mailQueue.add(
          EventType.MAIL_NOTIFICATION,
          {
            eventId: job.data.eventId,
            taskId: job.data.taskId,
            tenantId: job.data.tenantId,
            data: {
              to: recipient.email,
              subject: `Tenant ${schema} - Task Creation Failed`,
              text: `Hi ${recipient.name}, we cannot create the task ${job.data?.data?.title}, (taskId: ${job.data?.data?.taskId}) please try again later.`,
            },
          } as EventPayload,
          QUEUE_CONFIG,
        );
      }
    }
  }
}
