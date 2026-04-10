import { Role } from '@/common/enum/role.enum';

export class TokenPayloadDto {
  sub: string;
  email: string;
  role: Role;
}
