import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The store of the logged-in seller. Seller endpoints take the store from here, never from the request,
   * so a seller cannot name another store.
   */
  async ofSeller(userId: string) {
    const store = await this.prisma.store.findUnique({
      where: { ownerId: userId },
    });
    if (!store) {
      throw new ForbiddenException('This account has no store');
    }
    return store;
  }

  /** The store at a link; a link that belongs to no store is a plain 404. */
  async bySlug(slug: string) {
    const store = await this.prisma.store.findUnique({ where: { slug } });
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    return store;
  }

  /** Every store, for the page where a buyer picks one. Only what is public: no owner. */
  list() {
    return this.prisma.store.findMany({
      select: { slug: true, name: true, description: true },
      orderBy: [{ name: 'asc' }, { slug: 'asc' }],
      take: 100,
    });
  }

  /** What anyone may see of the store at a link. */
  async publicBySlug(slug: string) {
    const store = await this.bySlug(slug);
    return {
      slug: store.slug,
      name: store.name,
      description: store.description,
    };
  }
}
