import { Roles } from '@/common/decorator/roles.decorator';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@/modules/auth/enum/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedRoles = this.reflector.getAllAndOverride(Roles, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest();
    const userRole = request.user?.role as Role | undefined;

    if (userRole === Role.ADMIN) {
      if (Array.isArray(allowedRoles) && allowedRoles.includes(Role.ADMIN)) {
        return true;
      }
      throw new ForbiddenException(
        'Management administrator may only access tenant management routes',
      );
    }

    if (!allowedRoles) {
      return true;
    }

    if (!allowedRoles.some((role) => userRole === role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
