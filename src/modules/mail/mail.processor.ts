import { Injectable, Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EntityManager } from '@mikro-orm/postgresql';

import { getPublicSchema } from '@/common/tenant/public-schema';
import { Event } from '@/modules/event/entities/event.entity';
import { EventFailureLog } from '@/modules/event/entities/event-failure-log.entity';
import { EventPayload } from '@/modules/event/dto';
import { EventStatus, EventType } from '@/modules/event/enum/event.enum';
import { Tenant } from '@/modules/tenant/entity/tenant.entity';
import { MAIL_PROCESSING_QUEUE } from './mail.queue';
import { MailService } from './mail.service';
import { sanitizedTenantName } from '@/common/tenant';

@Processor(MAIL_PROCESSING_QUEUE, { lockDuration: 30000 })
@Injectable()
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(
    private readonly em: EntityManager,
    private readonly mailService: MailService,
  ) {
    super();
  }

  async process(job: Job<EventPayload>): Promise<void> {
    if (job.name !== EventType.MAIL_NOTIFICATION) {
      this.logger.warn(`[mail] unknown job name: ${job.name}`);
      return;
    }

    const schema = sanitizedTenantName(job.data.tenantId);
    const fork = this.em.fork({ schema });
    const { eventId, taskId, data } = job.data;

    if (!data || !('to' in data)) {
      this.logger.error(`[mail] invalid data: ${JSON.stringify(data)}`);
      throw new Error('Invalid data');
    }

    const eventRepo = fork.getRepository(Event);

    await eventRepo.nativeUpdate(eventId, {
      status: EventStatus.PROCESSING,
    });

    const publicFork = this.em.fork({ schema: getPublicSchema() });
    const tenantRow = await publicFork.findOne(Tenant, { name: schema });
    const tenantFrom = tenantRow?.fromEmail?.trim();

    await this.mailService.sendMail({
      ...(tenantFrom ? { from: tenantFrom } : {}),
      to: data.to,
      subject: data.subject,
      text: data.text,
    });

    await eventRepo.nativeUpdate(eventId, {
      status: EventStatus.COMPLETED,
    });

    this.logger.log(`[mail] success taskId=${taskId}`);
  }

  @OnWorkerEvent('ready')
  onReady(): void {
    this.logger.log('Mail worker is ready and listening...');
  }

  @OnWorkerEvent('error')
  onError(err: Error): void {
    this.logger.error('Mail worker error:', err);
  }

  @OnWorkerEvent('failed')
  async onFailed(
    job: Job<EventPayload> | undefined,
    failureError: Error,
  ): Promise<void> {
    const schema = sanitizedTenantName(job?.data?.tenantId);
    const fork = this.em.fork({ schema });
    if (!job || job.name === 'mail_test') return;

    const data = job.data as EventPayload;
    if (!data?.taskId || !data?.eventId) return;

    const eventRepository = fork.getRepository(Event);
    const eventFailureLogRepository = fork.getRepository(EventFailureLog);

    const event = await eventRepository.findOneOrFail({ id: data.eventId });

    eventFailureLogRepository.create({
      event,
      attempt: job.attemptsMade,
      jobId: job.id,
    });

    await fork.flush();
    this.logger.error(
      `[mail] failed taskId=${data.taskId} attempt=${job.attemptsMade}, tenant=${schema}`,
      failureError,
    );

    const isFinal = job.attemptsMade >= job.opts.attempts;

    if (isFinal) {
      await eventRepository.nativeUpdate(data.eventId, {
        status: EventStatus.FAILED,
      });
      this.logger.log(
        `[mail] moved to DLQ jobId=${job.id} taskId=${data.taskId},  tenant=${schema}`,
      );
    }
  }
}
