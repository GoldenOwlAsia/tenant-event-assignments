import { Migration } from '@mikro-orm/migrations';

export class Migration20260403102334 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "event" ("id" varchar(255) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "tenant_id" varchar(255) not null, "payload" jsonb null, "status" varchar(255) not null default 'pending', constraint "event_pkey" primary key ("id"));`,
    );
    this.addSql(
      `alter table "event" add constraint "event_tenant_id_unique" unique ("tenant_id");`,
    );

    this.addSql(
      `create table "event_failure_logs" ("id" varchar(255) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "tenant_id" varchar(255) not null, "job_id" varchar(255) not null, "attempt" int not null, "event_id" varchar(255) not null, constraint "event_failure_logs_pkey" primary key ("id"));`,
    );

    this.addSql(
      `alter table "event_failure_logs" add constraint "event_failure_logs_event_id_foreign" foreign key ("event_id") references "event" ("id") on update cascade;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "event_failure_logs" drop constraint "event_failure_logs_event_id_foreign";`,
    );

    this.addSql(`drop table if exists "event" cascade;`);

    this.addSql(`drop table if exists "event_failure_logs" cascade;`);
  }
}
