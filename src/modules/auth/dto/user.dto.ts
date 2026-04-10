import { Role } from '@/common/enum/role.enum';

export class UserDto {
  id: string;
  email: string;
  name: string;
  role: Role;
}
