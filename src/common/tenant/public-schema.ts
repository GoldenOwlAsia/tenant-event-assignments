/**
 * PostgreSQL schema for **management** metadata (`tenant` registry, `public_admin`, …).
 * Defaults to **`public`**. Per-tenant app tables live in other schemas.
 *
 * Override with `PUBLIC_MIGRATION_SCHEMA` or `PUBLIC_SCHEMA` if needed.
 */
export function getPublicSchema(): string {
  return (
    process.env.PUBLIC_MIGRATION_SCHEMA?.trim() ||
    process.env.PUBLIC_SCHEMA?.trim() ||
    'public'
  );
}
