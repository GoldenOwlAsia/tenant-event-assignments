import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';

import { IJwtStrategy } from '@/modules/auth/strategies/jwt.strategy';
import { User } from '@/modules/auth/entity/user.entity';
import { TaskAction } from '@/common/enum/action.enum';
import { TaskStatus } from '@/common/enum/status.enum';
import { SendMailData } from '../../event/dto';
import { EventType } from '@/common/enum/event.enum';

import { Task } from '../entity/task.entity';
import { AssignTaskBodyRequest } from '../dto/assign-task.dto';
import { mapTaskToDto, TaskDto } from '../dto/task.dto';
import { getTaskTransition } from '../state-machine/task.state-machine';
import { EventService } from '../../event/event.service';

export class TaskActionCommand {
  constructor(
    public readonly user: IJwtStrategy,
    public readonly taskId: string,
    public readonly action: TaskAction,
    public readonly assignTaskDto: AssignTaskBodyRequest,
  ) {}
}

@CommandHandler(TaskActionCommand)
export class TaskActionHandler implements ICommandHandler<
  TaskActionCommand,
  TaskDto
> {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: EntityRepository<Task>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    private readonly em: EntityManager,
    private readonly eventService: EventService,
  ) {}

  async execute(command: TaskActionCommand): Promise<TaskDto> {
    const { user, taskId, action, assignTaskDto } = command;
    const task = await this.taskRepository.findOneOrFail({ id: taskId });

    const transition = getTaskTransition(task.taskStatus, action);
    if (!transition) {
      throw new BadRequestException('Invalid action for current task status');
    }
    const { to, roles } = transition;
    if (!roles.includes(user.role)) {
      throw new ForbiddenException(
        'You are not authorized to perform this action',
      );
    }

    if (to === TaskStatus.ASSIGNED) {
      if (!assignTaskDto.userId) {
        throw new BadRequestException('User ID is required');
      }
      const assignedTo = await this.userRepository.findOneOrFail({
        id: assignTaskDto.userId,
      });
      task.assignedTo = assignedTo;
    }

    task.taskStatus = to;
    this.em.persist(task);
    await this.em.flush();

    await this.notifyByEmail(task);

    return mapTaskToDto(task);
  }

  private async notifyByEmail(task: Task) {
    if (task.taskStatus === TaskStatus.ASSIGNED) {
      const recipient = await this.userRepository.findOneOrFail({
        id: task.assignedTo?.id,
      });

      const subject = `Task: ${task.title}`;
      const text = `Hi ${recipient.name}, Notification for task "${task.title}" (id: ${task.id}). You have been assigned to the task.`;
      await this.eventService.createTaskProcessingEvent({
        event: EventType.MAIL_NOTIFICATION,
        taskId: task.id,
        data: { to: recipient.email, subject, text },
      });
    } else if (task.taskStatus === TaskStatus.PENDING_REVIEW) {
      const recipient = await this.userRepository.findOneOrFail({
        id: task.reporter?.id,
      });
      const subject = `Task: ${task.title}`;
      const text = `Hi ${recipient.name}, Notification for task "${task.title}" (id: ${task.id}). Please review the task.`;
      await this.eventService.createTaskProcessingEvent({
        event: EventType.MAIL_NOTIFICATION,
        taskId: task.id,
        data: { to: recipient.email, subject, text } as SendMailData,
      });
    }
  }
}
