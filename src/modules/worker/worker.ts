import { Worker, Job, Queue } from 'bullmq';
import { MikroORM } from '@mikro-orm/core';
import { Event } from '../event/entities/event.entity';
import mikroConfig from '../../../mikro-orm.config';
import { EventStatus, TaskStatus } from '@/common/enum/status.enum';
import { EventFailureLog } from '../event/entities/event-failure-log.entity';
import { EventPayload } from '../event/dto';
import { Task } from '../task-management/entity/task.entity';
import { EventType } from '@/common/enum/event.enum';
import { User } from '../auth/entity/user.entity';
import { QUEUE_CONFIG } from '@/common/constant/event.constant';

async function bootstrap() {
  const orm = await MikroORM.init(mikroConfig);
  const mailProcessingQueue = new Queue('mail-processing-queue', {
    connection: {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
    },
  });

  console.log(`Start task processing worker`);

  const worker = new Worker(
    'task-processing-queue',
    async (job: Job<EventPayload>) => {
      const em = orm.em.fork();
      const { eventId, taskId, data } = job.data;
      console.log(`Processing job: taskId: ${taskId}`);

      const eventRepo = em.getRepository(Event);
      const userRepo = em.getRepository(User);
      const taskRepo = em.getRepository(Task);

      if (!data || !('taskId' in data)) {
        console.error(`[task] invalid data: ${JSON.stringify(data)}`);
        throw new Error('Invalid data');
      }
      // Update processing
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

        em.persist(task);

        await em.flush();

        mailProcessingQueue.add(
          EventType.MAIL_NOTIFICATION,
          {
            eventId: job.data.eventId,
            taskId: job.data.taskId,
            data: {
              to: reporter.email,
              subject: `Task ${task.title} create uccess`,
              text: `Hi ${reporter.name}, Task ${task.title} has been created successfully`,
            },
          },
          QUEUE_CONFIG,
        );
      } catch (error: unknown) {
        console.error(`[task] error: ${error}`);
        throw error;
      }

      await eventRepo.nativeUpdate(eventId, {
        status: EventStatus.COMPLETED,
      });
      em.flush();
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
      id: job.data.eventId,
    });

    eventFailureLogRepository.create({
      event: event,
      attempt: job.attemptsMade,
      jobId: job.id,
    });

    await eventFailureLogRepository.getEntityManager().flush();
    console.warn(
      `Failed job, taskId: ${job.data.taskId}, attempt:${job.attemptsMade}, message: ${err.message}`,
    );

    console.error(`[task] error: ${job.attemptsMade}  ${job.opts.attempts}`);
    const isFinal = job.attemptsMade >= job.opts.attempts;

    if (isFinal) {
      const eventRepo = em.getRepository(Event);
      const userRepo = em.getRepository(User);

      await eventRepo.nativeUpdate(job.data.eventId, {
        status: EventStatus.FAILED,
      });

      if (job.data.data && 'reporterId' in job.data.data) {
        const recipient = await userRepo.findOneOrFail({
          id: job.data.data?.reporterId,
        });

        console.warn(
          `[task] Moved to DLQ: jobId=${job.id}, taskId=${job.data.taskId}`,
        );

        mailProcessingQueue.add(
          EventType.MAIL_NOTIFICATION,
          {
            eventId: job.data.eventId,
            taskId: job.data.taskId,
            data: {
              to: recipient.email,
              subject: 'Task Creation Failed',
              text: `Hi ${recipient.name}, we cannot create the task ${job.data?.data?.title}, please try again later.`,
            },
          },
          QUEUE_CONFIG,
        );
      }
    }
  });
}

bootstrap();
