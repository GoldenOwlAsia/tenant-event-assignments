import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { JwtAuthGuard, RolesGuard } from '@/modules/auth/guard';
import { ReqUser } from '@/decorator/api.decorator';
import { IJwtStrategy } from '@/modules/auth/strategies/jwt.strategy';
import { PaginationQueryDto, PaginationResponseDto } from '@/common/pagination';
import {
  CreateTaskBodyRequestDto,
  CreateTaskResponseDto,
} from './dto/create-task.dto';
import { TaskDto } from './dto/task.dto';
import { Role } from '@/common/enum/role.enum';
import { Roles } from '@/decorator/roles.decorator';
import { AssignTaskBodyRequest } from './dto/assign-task.dto';
import { TaskAction } from '@/common/enum/action.enum';
import { FindAllTasksPaginatedQuery } from './query/find-all-tasks-paginated.query';
import { CreateTaskCommand } from './command/create-task.command';
import { TaskActionCommand } from './command/task-action.command';

@Controller('task')
@ApiTags('Task')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class TaskController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiQuery({ type: PaginationQueryDto })
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
    const { id: reporterId } = req;
    return this.commandBus.execute(
      new CreateTaskCommand(reporterId, createTaskDto),
    );
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
