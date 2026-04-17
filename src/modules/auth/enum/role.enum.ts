export enum Role {
  /** Tenant management only; blocked from other APIs via `RolesGuard`. */
  ADMIN = 'admin',
  REPORTER = 'reporter',
  USER = 'user',
}
