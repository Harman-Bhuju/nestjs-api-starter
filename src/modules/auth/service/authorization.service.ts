import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Authorization } from '../entities/authorization.entity';

/**
 * Takes roleId straight from the (already-verified) JWT payload — no Role
 * lookup happens here or in AuthorizationGuard anymore. The JWT is the
 * source of truth for "which role is this request acting as"; this service
 * only answers "what is that roleId allowed to do".
 */
@Injectable()
export class AuthorizationService {
  // roleId -> cached permission rows
  private readonly authCache = new Map<
    string,
    { data: Authorization[]; expiry: number }
  >();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;
  private readonly regexCache = new Map<string, RegExp>();

  constructor(
    @InjectRepository(Authorization)
    private readonly authorizationRepository: Repository<Authorization>,
  ) {}

  async isAuthorized(
    roleId: string,
    path: string,
    method: string,
  ): Promise<boolean> {
    const authorizations = await this.getAuthorizationsForRole(roleId);

    return authorizations.some((auth) => {
      const pathMatches = this.getCompiledRegex(auth.path).test(path);
      const methodMatches = auth.methods.includes(method);
      return pathMatches && methodMatches;
    });
  }

  /** Call this after seeding/editing authorizations at runtime to avoid waiting out the TTL. */
  invalidateCache(roleId?: string) {
    if (roleId) this.authCache.delete(roleId);
    else this.authCache.clear();
  }

  private async getAuthorizationsForRole(
    roleId: string,
  ): Promise<Authorization[]> {
    const cached = this.authCache.get(roleId);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    const authorizations = await this.authorizationRepository.find({
      where: { role: { id: roleId } },
      select: {
        id: true,
        path: true,
        methods: true,
      },
    });

    this.authCache.set(roleId, {
      data: authorizations,
      expiry: Date.now() + this.CACHE_TTL_MS,
    });

    return authorizations;
  }

  private getCompiledRegex(pathPattern: string): RegExp {
    const cached = this.regexCache.get(pathPattern);
    if (cached) return cached;

    const compiled = this.convertPathToRegex(pathPattern);
    this.regexCache.set(pathPattern, compiled);
    return compiled;
  }

  private convertPathToRegex(pathPattern: string): RegExp {
    let regexPattern = pathPattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    regexPattern = regexPattern.replace(/\*/g, '(.*)');
    regexPattern = regexPattern.replace(/:[^/]+/g, '([^/]+)');
    return new RegExp(`^${regexPattern}$`);
  }
}
