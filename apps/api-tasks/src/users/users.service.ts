import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { toPublicUser } from './public-user';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: { email: string; name?: string; password: string }) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async listPublic() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return users.map(toPublicUser);
  }

  /** Returns the updated user, or null when it does not exist. */
  async changeRole(id: string, role: Role) {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) {
      return null;
    }
    const user = await this.prisma.user.update({
      where: { id },
      data: { role },
    });
    return toPublicUser(user);
  }
}
