import * as dotenv from 'dotenv';
dotenv.config();
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { defineConfig } from '@mikro-orm/postgresql';
import { Event } from '@/modules/event/entities/event.entity';
import { EventFailureLog } from '@/modules/event/entities/event-failure-log.entity';
import { User } from '@/modules/auth/entity/user.entity';
import { Task } from '@/modules/task/entity/task.entity';
import { DatabaseSeeder } from '@/database/seeders/database.seeder';


export default defineConfig({
  dbName: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  driver: PostgreSqlDriver,
  entities: [Event, EventFailureLog, User, Task],
  debug: false,

  migrations: {
    path: './src/database/migrations',
  },
  seeder: {
    path: './src/database/seeders',
    defaultSeeder: DatabaseSeeder.name,
  },
  pool: {
    min: 0,
    max: 10,
    acquireTimeoutMillis: 60000, // Increase timeout to 60 seconds
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
  },
});
