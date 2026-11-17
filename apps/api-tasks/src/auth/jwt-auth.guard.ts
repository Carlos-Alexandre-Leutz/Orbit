import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedRequest } from './authenticated-user';

interface TokenPayload {
  sub: string;
  role: Role;
}

/**
 * Requires a valid `Authorization: Bearer <token>` and puts the user id and role on the request. The role is
 * read from the database on every call, not from the token: a role changed or taken away (an admin demoted, a
 * seller promoted) counts at once, and a deleted account stops working even if its token has not expired.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

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
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true },
      });
      if (!user) throw new Error('unknown user');
      request.user = { id: user.id, role: user.role };
      return true;
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }
  }
}
