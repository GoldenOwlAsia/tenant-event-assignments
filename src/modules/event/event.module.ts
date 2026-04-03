import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Event } from './entities/event.entity';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EventFailureLog } from './entities/event-failure-log.entity';
@Module({
  imports: [
    MikroOrmModule.forFeature([Event, EventFailureLog]),
    ConfigModule,
    BullModule.registerQueue({
      name: 'event-queue',
    }),
  ],
  controllers: [EventController],
  providers: [EventService],
})
export class EventModule {}
