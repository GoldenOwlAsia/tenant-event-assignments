import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Event } from './entities/event.entity';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EventFailureLog } from './entities/event-failure-log.entity';
import { Task } from '../task-management/entity/task.entity';

@Module({
  imports: [
    MikroOrmModule.forFeature([Event, EventFailureLog, Task]),
    ConfigModule,
    BullModule.registerQueueAsync(
      {
        name: 'task-processing-queue',
      },
      {
        name: 'mail-processing-queue',
      },
    ),
  ],
  controllers: [EventController],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
