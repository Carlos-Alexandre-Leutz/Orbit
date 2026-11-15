import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service';
import { toPublicUser } from '../users/public-user';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SLUG_MESSAGES, checkSlug, slugFromName } from '../stores/store-slug';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private jwt: JwtService,
  ) {}

  async issueSession(user: User) {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
    });
    return { accessToken, user: toPublicUser(user) };
  }

  /**
   * Self-registration creates a customer, or a seller together with the store, in one statement.
   * The role is decided here from `accountType`, never copied from the request.
   */
  async register(data: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (exists) {
      throw new ConflictException('Este e-mail já está cadastrado');
    }
    const store = await this.storeToCreate(data);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          password: await bcrypt.hash(data.password, 10),
          role: store ? 'SELLER' : 'CUSTOMER',
          ...(store && { store: { create: store } }),
        },
        include: { store: true },
      });
      const session = await this.issueSession(user);
      return user.store
        ? {
            ...session,
            store: {
              id: user.store.id,
              slug: user.store.slug,
              name: user.store.name,
            },
          }
        : session;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = error.meta?.target;
        if (Array.isArray(target) && target.includes('slug')) {
          throw new ConflictException('This store link is already taken');
        }
        throw new ConflictException('Este e-mail já está cadastrado');
      }
      throw error;
    }
  }

  /** The store a new seller gets, validated; null for a customer. */
  private async storeToCreate(data: RegisterDto) {
    if (data.accountType !== 'SELLER') return null;
    const name = data.storeName?.trim();
    if (!name) {
      throw new BadRequestException('A seller needs a store name');
    }
    const slug = data.storeSlug?.trim() || slugFromName(name);
    const problem = checkSlug(slug);
    if (problem) {
      throw new BadRequestException(SLUG_MESSAGES[problem]);
    }
    const taken = await this.prisma.store.findUnique({ where: { slug } });
    if (taken) {
      throw new ConflictException('This store link is already taken');
    }
    return { name, slug };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { store: true },
    });
    if (!user || this.isExpired(user)) {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }
    // A seller's pages need to know their store; everyone else has none.
    return {
      ...toPublicUser(user),
      store: user.store
        ? { slug: user.store.slug, name: user.store.name }
        : null,
    };
  }

  private isExpired(user: User) {
    return !!user.expiresAt && user.expiresAt.getTime() <= Date.now();
  }

  /**
   * A temporary customer for a visitor who has not registered (the base of demo mode).
   * It has no usable password, so it cannot log in; its token lasts exactly as long as the account.
   */
  async createAnonymous() {
    const ttlHours = Number(process.env.ANONYMOUS_TTL_HOURS) || 24;
    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);
    const user = await this.prisma.user.create({
      data: {
        email: `anon-${crypto.randomUUID()}@anonymous.orbit.invalid`,
        password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
        role: 'CUSTOMER',
        isAnonymous: true,
        expiresAt,
      },
    });
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role },
      { expiresIn: ttlHours * 3600 },
    );
    return { accessToken, user: toPublicUser(user), expiresAt };
  }

  /** Removes expired anonymous accounts. The scheduled job that calls it arrives with the retention PBI. */
  async deleteExpiredAnonymous() {
    const { count } = await this.prisma.user.deleteMany({
      where: {
        isAnonymous: true,
        expiresAt: { lt: new Date() },
        // An account with orders is a record of a sale and is kept.
        orders: { none: {} },
      },
    });
    return count;
  }

  async login(data: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    const valid =
      !!user &&
      !user.isAnonymous &&
      (await bcrypt.compare(data.password, user.password));
    if (!user || !valid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    return this.issueSession(user);
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    const message = 'Se o e-mail estiver cadastrado, enviaremos as instruções.';
    if (!user) {
      return { message };
    }

    const token = crypto.randomBytes(20).toString('hex');

    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expires,
      },
    });

    await this.mailService.sendPasswordReset(user.email, token);

    return { message };
  }

  async resetPassword(data: ResetPasswordDto) {
    const { token, newPassword } = data;

    const user = await this.prisma.user.findFirst({
      where: { passwordResetToken: token },
    });

    if (!user) {
      throw new BadRequestException('Token inválido ou expirado');
    }

    if (
      user.passwordResetExpires &&
      new Date() > new Date(user.passwordResetExpires)
    ) {
      throw new BadRequestException('Token expirado');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return { message: 'Senha alterada com sucesso!' };
  }
}
