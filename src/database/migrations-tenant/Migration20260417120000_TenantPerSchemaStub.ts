import { Migration } from '@mikro-orm/migrations';

/**
 * Per-tenant migration stub (optional DDL that must exist inside each tenant schema only).
 * Registry `tenant` / `public_admin` live in `public` (see `Migration20260418000000_InitialPublicSchema`).
 */
export class Migration20260417120000_TenantPerSchemaStub extends Migration {
  override async up(): Promise<void> {
    //
  }

  override async down(): Promise<void> {
    //
  }
}
