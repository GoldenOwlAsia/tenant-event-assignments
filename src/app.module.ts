import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from './config/jwt.config';
import { EventModule } from './modules/event/event.module';

import { MikroOrmModule } from '@mikro-orm/nestjs';
import mikroOrmConfig from '../mikro-orm.config';
import { AuthModule } from './modules/auth/auth.module';
import { TaskModule } from './modules/task/task.module';
import { BullRootModule } from './bull/bull-root.module';
import { TenantEntityManagerProvider } from './database/tenant.provider';
import { TenantModule } from './modules/tenant/tenant.module';
import { TenantMiddleware } from './common/tenant';

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
    TenantModule,
  ],
  providers: [TenantEntityManagerProvider, TenantMiddleware],
  exports: [TenantEntityManagerProvider],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'auth/admin/login', method: RequestMethod.POST },
        { path: 'tenant', method: RequestMethod.POST },
        { path: 'tenant/(.*)', method: RequestMethod.DELETE },
      )
      .forRoutes('*');
  }
}
