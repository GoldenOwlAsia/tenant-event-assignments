import { Entity, ManyToOne, Property } from '@mikro-orm/core';

import { Base } from '@/common/entity';
import { User } from '@/modules/auth/entity/user.entity';
import { TaskStatus } from '@/modules/task/enum/task-status.enum';

@Entity({ tableName: 'task' })
export class Task extends Base {
  // Constrain task name unique for death-letter queue
  @Property({ type: 'string', unique: true })
  title: string;

  @Property({ type: 'text', nullable: true })
  description?: string | null;

  @Property({ type: 'string' })
  taskStatus: TaskStatus = TaskStatus.CREATED;

  @ManyToOne(() => User, { nullable: true })
  assignedTo?: User;

  @ManyToOne(() => User)
  reporter!: User;

  @Property({ type: 'date' })
  dueDate: Date;
}
