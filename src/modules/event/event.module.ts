import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Event } from './entities/event.entity';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EventFailureLog } from './entities/event-failure-log.entity';
import { Task } from '../task/entity/task.entity';
import { TASK_PROCESSING_QUEUE } from '../task/task.queue';
import { MAIL_PROCESSING_QUEUE } from '../mail/mail.queue';

@Module({
  imports: [
    MikroOrmModule.forFeature([Event, EventFailureLog, Task]),
    ConfigModule,
    BullModule.registerQueue(
      { name: TASK_PROCESSING_QUEUE },
      { name: MAIL_PROCESSING_QUEUE },
    ),
  ],
  controllers: [EventController],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
