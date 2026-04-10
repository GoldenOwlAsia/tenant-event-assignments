import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from './config/jwt.config';
import { EventModule } from './modules/event/event.module';

import { MikroOrmModule } from '@mikro-orm/nestjs';
import mikroOrmConfig from '../mikro-orm.config';
import { AuthModule } from './modules/auth/auth.module';
import { TaskModule } from './modules/task/task.module';
import { BullRootModule } from './bull/bull-root.module';
@Module({
  imports: [
    MikroOrmModule.forRoot(mikroOrmConfig),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [jwtConfig],
    }),
    BullRootModule,
    EventModule,
    AuthModule,
    TaskModule,
  ],
})
export class AppModule {}
