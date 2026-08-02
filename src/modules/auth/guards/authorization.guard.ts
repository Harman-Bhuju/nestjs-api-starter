import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';
import { AuthRequest } from 'src/common/interfaces/auth-request.interface';
import { Role } from '../entities/role.entity';
import { AuthorizationService } from '../service/authorization.service';

/**
 * Runs AFTER AccessTokenGuard has attached req.user. Checks the DB-driven
 * (role, path, method) permission table via AuthorizationService.
 *
 * Order matters: register both guards at the app level with
 * AccessTokenGuard listed before AuthorizationGuard.
 */
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
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
    if (!user.role) {
      throw new ForbiddenException('User role not found in token');
    }

    const role = await this.roleRepository.findOne({
      where: { role: user.role },
    });
    if (!role) {
      throw new ForbiddenException(`Role '${user.role}' not found`);
    }

    const isAuthorized = await this.authorizationService.isAuthorized(
      role,
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
