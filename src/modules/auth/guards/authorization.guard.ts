import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';
import { AuthRequest } from 'src/common/interfaces/auth-request.interface';
import { AuthorizationService } from '../service/authorization.service';

/**
 * Runs AFTER AccessTokenGuard has attached req.user. Checks the DB-driven
 * (role, path, method) permission table via AuthorizationService.
 *
 * roleId comes straight from the JWT payload — there is no Role repository
 * lookup here anymore. This trades "always up to the second" for "one
 * fewer DB round trip per request"; if a user's role is ever reassigned,
 * the change takes effect the moment they get a new access token (login,
 * or the next refresh), same as every other JWT claim already does.
 *
 * Order matters: register both guards at the app level with
 * AccessTokenGuard listed before AuthorizationGuard.
 */
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as AuthRequest).user;

    if (!user?.sub) {
      throw new ForbiddenException('User not authenticated');
    }
    if (!user.roleId) {
      throw new ForbiddenException('User role not found in token');
    }

    const isAuthorized = await this.authorizationService.isAuthorized(
      user.roleId,
      request.path,
      request.method,
    );

    if (!isAuthorized) {
      throw new ForbiddenException(
        `Access denied. Role '${user.role}' cannot ${request.method} ${request.path}`,
      );
    }

    return true;
  }
}
