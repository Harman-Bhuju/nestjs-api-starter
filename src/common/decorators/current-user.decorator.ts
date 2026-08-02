import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AccessTokenPayload } from '../../modules/auth/interfaces/access-token-payload.interface';
/**
 * Returns the authenticated user's decoded access-token payload.
 * Usage: getMe(@CurrentUser() user: AccessTokenPayload)
 * Usage: getMe(@CurrentUser('sub') userId: string)
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AccessTokenPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: AccessTokenPayload = request.user;
    return field ? user?.[field] : user;
  },
);
