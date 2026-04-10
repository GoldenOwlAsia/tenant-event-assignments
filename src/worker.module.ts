import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from './config/jwt.config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import mikroOrmConfig from '../mikro-orm.config';
import { BullRootModule } from './bull/bull-root.module';
import { ProcessorsModule } from './processors/processors.module';

@Module({
  imports: [
    MikroOrmModule.forRoot(mikroOrmConfig),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [jwtConfig],
    }),
    BullRootModule,
    ProcessorsModule,
  ],
})
export class WorkerModule {}
