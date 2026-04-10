import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Task } from './entity/task.entity';
import { TaskController } from './task.controller';
import { User } from '@/modules/auth/entity/user.entity';
import { RolesGuard } from '@/modules/auth/guard/role.guard';
import { EventModule } from '../event/event.module';
import { CreateTaskHandler } from './command/create-task.command';
import { TaskActionHandler } from './command/task-action.command';
import { FindAllTasksPaginatedHandler } from './query/find-all-tasks-paginated.query';

const taskHandlers = [
  CreateTaskHandler,
  TaskActionHandler,
  FindAllTasksPaginatedHandler,
];

@Module({
  imports: [CqrsModule, MikroOrmModule.forFeature([Task, User]), EventModule],
  controllers: [TaskController],
  providers: [...taskHandlers, RolesGuard],
})
export class TaskManagementModule {}
