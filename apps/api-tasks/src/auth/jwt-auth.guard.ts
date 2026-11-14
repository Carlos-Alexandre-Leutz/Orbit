import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from './authenticated-user';

interface TokenPayload {
  sub: string;
  role: Role;
}

/** Requires a valid `Authorization: Bearer <token>` and puts the user id and role on the request. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Sessão ausente');
    }
    try {
      const payload = await this.jwt.verifyAsync<TokenPayload>(token);
      if (!payload.sub || !Object.values(Role).includes(payload.role)) {
        throw new Error('malformed token');
      }
      request.user = { id: payload.sub, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }
  }
}
