import { Migration } from '@mikro-orm/migrations';

/** Creates `user` and `task`; refactors `event` to use `task_id` and trims `event_failure_logs`. */
export class Migration20260410081710_CreateUserAndTaskTables extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "user" ("id" varchar(255) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "email" varchar(255) not null, "name" varchar(255) not null, "password" varchar(255) not null, "role" varchar(255) not null default 'user', constraint "user_pkey" primary key ("id"));`,
    );
    this.addSql(
      `alter table "user" add constraint "user_email_unique" unique ("email");`,
    );

    this.addSql(
      `create table "task" ("id" varchar(255) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "title" varchar(255) not null, "description" text null, "task_status" varchar(255) not null default 'created', "assigned_to_id" varchar(255) null, "reporter_id" varchar(255) not null, "due_date" date not null, constraint "task_pkey" primary key ("id"));`,
    );
    this.addSql(
      `alter table "task" add constraint "task_title_unique" unique ("title");`,
    );

    this.addSql(
      `alter table "task" add constraint "task_assigned_to_id_foreign" foreign key ("assigned_to_id") references "user" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "task" add constraint "task_reporter_id_foreign" foreign key ("reporter_id") references "user" ("id") on update cascade;`,
    );

    this.addSql(
      `alter table "event" drop constraint "event_tenant_id_unique";`,
    );

    this.addSql(`alter table "event" rename column "tenant_id" to "task_id";`);

    this.addSql(`alter table "event_failure_logs" drop column "tenant_id";`);
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "task" drop constraint "task_assigned_to_id_foreign";`,
    );

    this.addSql(
      `alter table "task" drop constraint "task_reporter_id_foreign";`,
    );

    this.addSql(`drop table if exists "user" cascade;`);

    this.addSql(`drop table if exists "task" cascade;`);

    this.addSql(`alter table "event" rename column "task_id" to "tenant_id";`);
    this.addSql(
      `alter table "event" add constraint "event_tenant_id_unique" unique ("tenant_id");`,
    );

    this.addSql(
      `alter table "event_failure_logs" add column "tenant_id" varchar(255) not null;`,
    );
  }
}
