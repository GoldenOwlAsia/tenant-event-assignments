import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

import type { TokenScope } from '../dto/token-payload.dto';

function getScope(req: Request): TokenScope | undefined {
  const u = (req as Request & { user?: { scope?: TokenScope } }).user;
  return u?.scope;
}

/** Allows only JWTs issued for management (`public` schema) admin login. */
@Injectable()
export class ManagementScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const scope = getScope(req);
    if (scope === 'management') {
      return true;
    }
    throw new ForbiddenException(
      'This action requires a management administrator token.',
    );
  }
}
