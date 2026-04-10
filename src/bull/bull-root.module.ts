import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { getBullRedisConnection } from './bull.config';

@Module({
  imports: [
    BullModule.forRoot({
      connection: getBullRedisConnection(),
    }),
  ],
  exports: [BullModule],
})
export class BullRootModule {}
