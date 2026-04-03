import { Logger } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { MikroORM } from '@mikro-orm/core';
import { Event } from '../event/entities/event.entity';
import mikroConfig from '../../../mikro-orm.config';
import { Status } from '@/common/enum/status.enum';
import { EventFailureLog } from '../event/entities/event-failure-log.entity';

async function bootstrap() {
  const orm = await MikroORM.init(mikroConfig);

  console.log(`Start worker`);

  const worker = new Worker(
    'event-queue',
    async (job: Job) => {
      const em = orm.em.fork();
      const { eventId, tenantId, payload } = job.data;
      console.log(`Processing job: tenantId: ${tenantId}`);

      const eventRepo = em.getRepository(Event);

      // Update processing
      await eventRepo.nativeUpdate(eventId, {
        status: Status.PROCESSING,
      });

      try {
        if (payload?.simulateFailure) {
          throw new Error('Simulated failure');
        }

        await eventRepo.nativeUpdate(eventId, {
          status: Status.COMPLETED,
        });

        console.log(`Success Job tenantId: ${tenantId}`);
      } catch (err: unknown) {
        // Failed job
        throw err;
      }
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
    console.log('Worker is ready and listening...');
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });

  worker.on('failed', async (job, err) => {
    const em = orm.em.fork();
    if (!job) return;

    const eventRepository = em.getRepository(Event);

    const eventFailureLogRepository = em.getRepository(EventFailureLog);

    const event = await eventRepository.findOneOrFail({
      tenantId: job.data.tenantId,
    });

    eventFailureLogRepository.create({
      event: event,
      tenantId: job.data.tenantId,
      attempt: job.attemptsMade,
      jobId: job.id,
    });

    await eventFailureLogRepository.getEntityManager().flush();
    console.log(
      `Failed job, tenantId: ${job.data.tenantId}, attempt:${job.attemptsMade}`,
    );

    const isFinal = job.attemptsMade === job.opts.attempts;

    if (isFinal) {
      const eventRepo = em.getRepository(Event);

      await eventRepo.nativeUpdate(job.data.eventId, {
        status: Status.FAILED,
      });

      console.log(
        `Moved to DLQ: jobId=${job.id}, tenantId=${job.data.tenantId}`,
      );
    }
  });
}

bootstrap();
