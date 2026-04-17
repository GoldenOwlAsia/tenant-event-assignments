import { Migration } from '@mikro-orm/migrations';

import { getPublicSchema } from '@/common/tenant/public-schema';

function quotePgIdent(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Single migration for the PostgreSQL `public` management schema (`tenant` + `public_admin`).
 * Override schema with `PUBLIC_MIGRATION_SCHEMA` / `PUBLIC_SCHEMA` if needed.
 */
export class Migration20260418000000_InitialPublicSchema extends Migration {
  override async up(): Promise<void> {
    const schema = getPublicSchema();
    const q = quotePgIdent(schema);

    this.addSql(
      `create table if not exists ${q}."tenant" ("id" varchar(255) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "name" varchar(255) not null, "description" text null, "from_email" varchar(255) not null default '', "active" boolean not null default true, constraint "tenant_pkey" primary key ("id"));`,
    );
    this.addSql(
      `create unique index if not exists "tenant_name_unique" on ${q}."tenant" ("name");`,
    );

    this.addSql(
      `create table if not exists ${q}."public_admin" ("id" varchar(255) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "email" varchar(255) not null, "name" varchar(255) not null, "password" varchar(255) not null, constraint "public_admin_pkey" primary key ("id"));`,
    );
    this.addSql(
      `create unique index if not exists "public_admin_email_unique" on ${q}."public_admin" ("email");`,
    );
  }

  override async down(): Promise<void> {
    const schema = getPublicSchema();
    const q = quotePgIdent(schema);
    this.addSql(`drop table if exists ${q}."public_admin" cascade;`);
    this.addSql(`drop table if exists ${q}."tenant" cascade;`);
  }
}
