import { TaskStatus } from '@/common/enum/status.enum';

import { Task } from '../entity/task.entity';

export interface IAssign {
  id: string;
  name: string;
}

export class TaskDto {
  id: string;
  title: string;
  description?: string;
  taskStatus: TaskStatus;
  assignedTo?: IAssign | null;
  reportTo: IAssign;
  dueDate: Date;
}

export function mapTaskToDto(task: Task): TaskDto {
  const assignee = task?.assignedTo;
  const reporter = task.reporter;

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    taskStatus: task.taskStatus,
    dueDate: task.dueDate,
    assignedTo: assignee
      ? {
          id: assignee.id,
          name: assignee.name,
        }
      : null,
    reportTo: {
      id: reporter.id,
      name: reporter.name,
    },
  };
}
