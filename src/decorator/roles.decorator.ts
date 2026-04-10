import { Reflector } from '@nestjs/core';
import { Role } from '@/common/enum/role.enum';

export const Roles = Reflector.createDecorator<Role[]>();
