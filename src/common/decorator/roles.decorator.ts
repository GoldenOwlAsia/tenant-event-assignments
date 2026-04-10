import { Reflector } from '@nestjs/core';
import { Role } from '@/modules/auth/enum/role.enum';

export const Roles = Reflector.createDecorator<Role[]>();
