import { Worker, Job } from 'bullmq';
import { MikroORM } from '@mikro-orm/core';
import mikroConfig from '../../../mikro-orm.config';
import { Event } from '../event/entities/event.entity';
import { EventStatus } from '@/common/enum/status.enum';
import { EventFailureLog } from '../event/entities/event-failure-log.entity';
import { EventPayload } from '../event/dto';

import { EventType } from '@/common/enum/event.enum';
import { createMailSender } from './mail-sender';

async function bootstrap() {
  const orm = await MikroORM.init(mikroConfig);
  const mail = createMailSender();

  console.log('Start mail worker');

  const worker = new Worker(
    'mail-processing-queue',
    async (job: Job<EventPayload>) => {
      if (job.name !== EventType.MAIL_NOTIFICATION) {
        console.warn(`[mail] unknown job name: ${job.name}`);
        return;
      }

      const em = orm.em.fork();
      const { eventId, taskId, data } = job.data;

      if (!data || !('to' in data)) {
        console.error(`[mail] invalid data: ${JSON.stringify(data)}`);
        throw new Error('Invalid data');
      }

      const eventRepo = em.getRepository(Event);

      await eventRepo.nativeUpdate(eventId, {
        status: EventStatus.PROCESSING,
      });

      await mail.sendMail({
        to: data.to,
        subject: data.subject,
        text: data.text,
      });

      await eventRepo.nativeUpdate(eventId, {
        status: EventStatus.COMPLETED,
      });

      console.log(`[mail] success taskId=${taskId}`);
    },
    {
      connection: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
      },
      lockDuration: 30000,
    },
  );

  worker.on('ready', () => {
    console.log('Mail worker is ready and listening...');
  });

  worker.on('error', (err) => {
    console.error('Mail worker error:', err);
  });

  worker.on('failed', async (job, failureError) => {
    const em = orm.em.fork();
    if (!job || job.name === 'mail_test') return;

    const data = job.data as EventPayload;
    if (!data?.taskId || !data?.eventId) return;

    const eventRepository = em.getRepository(Event);
    const eventFailureLogRepository = em.getRepository(EventFailureLog);

    const event = await eventRepository.findOneOrFail({ id: data.eventId });

    eventFailureLogRepository.create({
      event,
      attempt: job.attemptsMade,
      jobId: job.id,
    });

    await eventFailureLogRepository.getEntityManager().flush();
    console.error(
      `[mail] failed taskId=${data.taskId} attempt=${job.attemptsMade}`,
      failureError,
    );

    const isFinal = job.attemptsMade === job.opts.attempts;

    if (isFinal) {
      await eventRepository.nativeUpdate(data.eventId, {
        status: EventStatus.FAILED,
      });
      console.log(`[mail] moved to DLQ jobId=${job.id} taskId=${data.taskId}`);
    }
  });
}

bootstrap();
