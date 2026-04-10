import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { v4 } from 'uuid';

import { EventType } from '@/common/enum/event.enum';

import {
  CreateTaskBodyRequestDto,
  CreateTaskResponseDto,
} from '../dto/create-task.dto';
import { EventService } from '../../event/event.service';

export class CreateTaskCommand {
  constructor(
    public readonly reporterId: string,
    public readonly createTaskDto: CreateTaskBodyRequestDto,
  ) {}
}

@CommandHandler(CreateTaskCommand)
export class CreateTaskHandler implements ICommandHandler<
  CreateTaskCommand,
  CreateTaskResponseDto
> {
  constructor(private readonly eventService: EventService) {}

  async execute(command: CreateTaskCommand): Promise<CreateTaskResponseDto> {
    const { reporterId, createTaskDto } = command;
    const taskId = v4();

    this.eventService.createTaskProcessingEvent({
      event: EventType.TASK_CREATE,
      taskId,
      data: { ...createTaskDto, taskId, reporterId },
    });

    return {
      message:
        'Task is under create, you will be notified by email when it is created',
    };
  }
}
