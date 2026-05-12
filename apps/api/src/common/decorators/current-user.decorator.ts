import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export interface AuthenticatedUser {
  userId: string;
  organizationId: string;
  email: string;
  role: Role;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as AuthenticatedUser;
    return data ? user?.[data] : user;
  },
);
