import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { Session } from '../database/entities';
import { AuthService } from './auth.service';
export type AuthRequest = Request & { session: Session };
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const match = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.authorization ?? '');
    if (!match) throw new UnauthorizedException();
    request.session = await this.auth.authenticate(match[1]);
    return true;
  }
}
