import { Role } from '@/modules/auth/enum/role.enum';

export class TokenPayloadDto {
  sub: string;
  email: string;
  role: Role;
}
