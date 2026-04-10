import { EntityManager } from '@mikro-orm/postgresql';
import { Seeder } from '@mikro-orm/seeder';
import { Role } from '@/modules/auth/enum/role.enum';
import { TaskStatus } from '@/modules/task/enum/task-status.enum';
import { User } from '@/modules/auth/entity/user.entity';
import { Task } from '@/modules/task/entity/task.entity';

const SEED_TASK_TITLES = [
  'Project kickoff',
  'API documentation',
  'QA sign-off',
] as const;

export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const defaultUsers = [
      {
        email: 'user@assignment.local',
        name: 'Default User',
        password: 'User123!@#',
        role: Role.USER,
      },
      {
        email: 'reporter@assignment.local',
        name: 'Default Reporter',
        password: 'Reporter123!@#',
        role: Role.REPORTER,
      },
    ];

    for (const seedUser of defaultUsers) {
      const existingUser = await em.findOne(User, { email: seedUser.email });
      if (existingUser) continue;

      // Password is intentionally plain text here; User.@BeforeCreate hashes it.
      const user = em.create(User, seedUser);
      em.persist(user);
    }

    await em.flush();

    const reporter = await em.findOne(User, {
      email: 'reporter@assignment.local',
    });
    const assignee = await em.findOne(User, { email: 'user@assignment.local' });
    if (!reporter || !assignee) {
      return;
    }

    const alreadySeeded = await em.findOne(Task, {
      title: SEED_TASK_TITLES[0],
    });
    if (alreadySeeded) {
      return;
    }

    const dueSoon = new Date();
    dueSoon.setDate(dueSoon.getDate() + 7);

    const seedTasks: Array<{
      title: string;
      description: string;
      taskStatus: TaskStatus;
      assignedTo?: User;
    }> = [
      {
        title: SEED_TASK_TITLES[0],
        description: 'Initial backlog item from seed data.',
        taskStatus: TaskStatus.CREATED,
      },
      {
        title: SEED_TASK_TITLES[1],
        description: 'Draft endpoints for the assignment API.',
        taskStatus: TaskStatus.ASSIGNED,
        assignedTo: assignee,
      },
      {
        title: SEED_TASK_TITLES[2],
        description: 'Final verification before release.',
        taskStatus: TaskStatus.IN_PROGRESS,
        assignedTo: assignee,
      },
    ];

    for (const row of seedTasks) {
      em.create(Task, {
        title: row.title,
        description: row.description,
        taskStatus: row.taskStatus,
        reporter,
        assignedTo: row.assignedTo,
        dueDate: dueSoon,
      });
    }

    await em.flush();
  }
}
