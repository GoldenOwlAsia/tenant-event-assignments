import { TaskAction } from '@/modules/task/enum/action.enum';
import { Role } from '@/modules/auth/enum/role.enum';
import { TaskStatus } from '@/modules/task/enum/task-status.enum';

export type TaskStateMachineResponse = {
  to: TaskStatus;
  roles: Role[];
};

export const taskStateMachine: Record<
  TaskStatus,
  Partial<Record<TaskAction, TaskStateMachineResponse>>
> = {
  [TaskStatus.CREATED]: {
    [TaskAction.ASSIGN]: {
      to: TaskStatus.ASSIGNED,
      roles: [Role.REPORTER],
    },
  },
  [TaskStatus.ASSIGNED]: {
    [TaskAction.START]: {
      to: TaskStatus.IN_PROGRESS,
      roles: [Role.USER],
    },
    [TaskAction.UNASSIGN]: {
      to: TaskStatus.CREATED,
      roles: [Role.REPORTER],
    },
  },
  [TaskStatus.IN_PROGRESS]: {
    [TaskAction.REQUEST_REVIEW]: {
      to: TaskStatus.PENDING_REVIEW,
      roles: [Role.USER],
    },
  },
  [TaskStatus.PENDING_REVIEW]: {
    [TaskAction.APPROVE]: {
      to: TaskStatus.COMPLETED,
      roles: [Role.REPORTER],
    },
  },
  [TaskStatus.COMPLETED]: {},
};

export function getTaskTransition(
  status: TaskStatus,
  action: TaskAction,
): TaskStateMachineResponse | undefined {
  return taskStateMachine[status]?.[action];
}
