import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Event } from '@/modules/event/entities/event.entity';
import { EventFailureLog } from '@/modules/event/entities/event-failure-log.entity';
import { Task } from '@/modules/task/entity/task.entity';
import { User } from '@/modules/auth/entity/user.entity';
import { TaskProcessor } from '@/modules/task/task.processor';
import { MailProcessor } from '@/modules/mail/mail.processor';
import { MailService } from '@/modules/mail/mail.service';
import { TASK_PROCESSING_QUEUE } from '@/modules/task/task.queue';
import { MAIL_PROCESSING_QUEUE } from '@/modules/mail/mail.queue';

@Module({
  imports: [
    MikroOrmModule.forFeature([Event, EventFailureLog, Task, User]),
    BullModule.registerQueue(
      { name: TASK_PROCESSING_QUEUE },
      { name: MAIL_PROCESSING_QUEUE },
    ),
  ],
  providers: [TaskProcessor, MailProcessor, MailService],
})
export class ProcessorsModule {}
