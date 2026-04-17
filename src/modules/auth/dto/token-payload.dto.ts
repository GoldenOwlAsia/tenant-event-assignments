import { Role } from '@/modules/auth/enum/role.enum';

export const TOKEN_SCOPE = {
  management: 'management',
  tenant: 'tenant',
} as const;

export type TokenScope = (typeof TOKEN_SCOPE)[keyof typeof TOKEN_SCOPE];

export class TokenPayloadDto {
  sub: string;
  email: string;
  role: Role;

  scope: TokenScope;
  tenantId?: string;
}
