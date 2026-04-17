import { BadRequestException } from '@nestjs/common';
import { PG_SCHEMA_REGEX } from './tenant.constants';

export class InvalidTenantIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTenantIdError';
  }
}

/**
 * convert input schema to a safe PostgreSQL schema naming
 */
export function sanitizedTenantName(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) {
    throw new InvalidTenantIdError('Tenant id is empty');
  }

  const normalized = trimmed.replace(/-/g, '_');
  if (!PG_SCHEMA_REGEX.test(normalized)) {
    throw new BadRequestException(
      `${raw} is not a valid PostgreSQL schema name`,
    );
  }

  return normalized;
}
