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
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private jwt: JwtService,
  ) {}

  /** What the API ever returns about a user: no password hash and no reset fields. */
  toPublic(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isAnonymous: user.isAnonymous,
      createdAt: user.createdAt,
    };
  }

  async issueSession(user: User) {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
    });
    return { accessToken, user: this.toPublic(user) };
  }

  /** Self-registration always creates a customer; the role is never read from the request. */
  async register(data: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (exists) {
      throw new ConflictException('Este e-mail já está cadastrado');
    }
    try {
      const user = await this.prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          password: await bcrypt.hash(data.password, 10),
          role: 'CUSTOMER',
        },
      });
      return await this.issueSession(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Este e-mail já está cadastrado');
      }
      throw error;
    }
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
