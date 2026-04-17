import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiParam, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { ReqUser } from '@/common/decorator/api.decorator';
import { IJwtStrategy } from '@/modules/auth/strategies/jwt.strategy';
import {
  PaginationQueryDto,
  PaginationResponseDto,
} from '@/common/dto/pagination.dto';
import {
  CreateTaskBodyRequestDto,
  CreateTaskResponseDto,
} from './dto/create-task.dto';
import { TaskDto } from './dto/task.dto';
import { Role } from '@/modules/auth/enum/role.enum';
import { Roles } from '@/common/decorator/roles.decorator';
import { AssignTaskBodyRequest } from './dto/assign-task.dto';
import { TaskAction } from '@/modules/task/enum/action.enum';
import { FindAllTasksPaginatedQuery } from './query/find-all-tasks-paginated.query';
import { CreateTaskCommand } from './command/create-task.command';
import { TaskActionCommand } from './command/task-action.command';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@/modules/auth/guard/role.guard';

@Controller('task')
@ApiTags('Task')
@ApiSecurity({ bearer: [], TENANT_ID_HEADER: [] })
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TaskController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  findAll(
    @ReqUser() user: IJwtStrategy,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginationResponseDto<TaskDto>> {
    return this.queryBus.execute(new FindAllTasksPaginatedQuery(user, query));
  }

  @Post()
  @Roles([Role.REPORTER])
  create(
    @ReqUser() req: IJwtStrategy,
    @Body() createTaskDto: CreateTaskBodyRequestDto,
  ): Promise<CreateTaskResponseDto> {
    return this.commandBus.execute(new CreateTaskCommand(req, createTaskDto));
  }

  @Post('action/:taskId/:action')
  @ApiParam({
    name: 'action',
    enum: TaskAction,
    enumName: 'TaskAction',
    description: 'Task workflow action to perform',
  })
  @Roles([Role.USER, Role.REPORTER])
  taskAction(
    @ReqUser() req: IJwtStrategy,
    @Param('taskId') taskId: string,
    @Param('action') action: TaskAction,
    @Body() assignTaskDto: AssignTaskBodyRequest,
  ): Promise<TaskDto> {
    return this.commandBus.execute(
      new TaskActionCommand(req, taskId, action, assignTaskDto),
    );
  }
}
