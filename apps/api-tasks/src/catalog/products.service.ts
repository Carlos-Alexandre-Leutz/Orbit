import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ImageStorage } from '../images/image-storage';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsDto, ProductSort } from './dto/list-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const WITH_CATEGORY = {
  category: { select: { slug: true, name: true } },
  store: { select: { slug: true, name: true } },
};
const DEFAULT_PAGE_SIZE = 20;

/** `%` and `_` are wildcards in a LIKE pattern; a customer typing "100%" means the text "100%". */
const escapeLike = (word: string) => word.replace(/[\\%_]/g, '\\$&');

const ORDER: Record<ProductSort, Prisma.ProductOrderByWithRelationInput[]> = {
  name: [{ name: 'asc' }, { id: 'asc' }],
  price_asc: [{ priceCents: 'asc' }, { name: 'asc' }, { id: 'asc' }],
  price_desc: [{ priceCents: 'desc' }, { name: 'asc' }, { id: 'asc' }],
  newest: [{ createdAt: 'desc' }, { id: 'asc' }],
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImageStorage,
  ) {}

  async list(query: ListProductsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = this.filters(query);
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: WITH_CATEGORY,
        orderBy: ORDER[query.sort ?? 'name'],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /**
   * Every word of `q` must appear in the name, description or SKU (case does not matter),
   * so "cast skillet" finds "Cast iron skillet". Words are matched as plain text.
   */
  private filters(query: ListProductsDto): Prisma.ProductWhereInput {
    const words = (query.q ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 8)
      .map(escapeLike);
    return {
      active: true,
      ...(query.store ? { store: { slug: query.store } } : {}),
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.inStock === true ? { stock: { gt: 0 } } : {}),
      ...(query.inStock === false ? { stock: 0 } : {}),
      ...(words.length > 0
        ? {
            AND: words.map((word) => ({
              OR: [
                { name: { contains: word, mode: 'insensitive' as const } },
                {
                  description: { contains: word, mode: 'insensitive' as const },
                },
                { sku: { contains: word, mode: 'insensitive' as const } },
              ],
            })),
          }
        : {}),
    };
  }

  async get(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, active: true },
      include: WITH_CATEGORY,
    });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    return product;
  }

  /** Writes always carry the seller's own store id (from the session), never one sent by the client. */
  async create(storeId: string, dto: CreateProductDto) {
    const { categorySlug, ...data } = dto;
    const categoryId = await this.categoryId(storeId, categorySlug);
    await this.ownImagesOrFail(storeId, dto.imageIds);
    try {
      return await this.prisma.product.create({
        data: { ...data, categoryId, storeId },
        include: WITH_CATEGORY,
      });
    } catch (error) {
      throw this.translate(error);
    }
  }

  async update(storeId: string, id: string, dto: UpdateProductDto) {
    const { categorySlug, ...data } = dto;
    const categoryId = categorySlug
      ? await this.categoryId(storeId, categorySlug)
      : undefined;
    const before = await this.imageIdsOf(storeId, id);
    await this.ownImagesOrFail(storeId, dto.imageIds);
    try {
      const updated = await this.prisma.product.update({
        where: { id },
        data: { ...data, ...(categoryId ? { categoryId } : {}) },
        include: WITH_CATEGORY,
      });
      // Pictures taken off the product are deleted unless the store still shows them somewhere else.
      if (dto.imageIds) {
        const kept = new Set(dto.imageIds);
        await this.images.removeUnused(
          storeId,
          before.filter((imageId) => !kept.has(imageId)),
        );
      }
      return updated;
    } catch (error) {
      throw this.translate(error);
    }
  }

  /** A product may only show pictures its own store uploaded. */
  private async ownImagesOrFail(storeId: string, ids?: string[]) {
    if (!ids || ids.length === 0) return;
    const owned = await this.prisma.image.count({
      where: { storeId, id: { in: ids } },
    });
    if (owned !== new Set(ids).size) {
      throw new BadRequestException('A picture does not belong to this store');
    }
  }

  /**
   * Hides the product; the row stays so orders that point at it keep working. Its pictures are deleted, because
   * a hidden product is never shown again and its pictures would only fill the database.
   */
  async remove(storeId: string, id: string) {
    const pictures = await this.imageIdsOf(storeId, id);
    try {
      await this.prisma.product.update({
        where: { id },
        data: { active: false, imageIds: [] },
      });
    } catch (error) {
      throw this.translate(error);
    }
    await this.images.removeUnused(storeId, pictures);
  }

  /** A product of another store is answered exactly like one that does not exist. */
  /** The pictures a product of this store has now; a product of another store is "not found". */
  private async imageIdsOf(storeId: string, id: string) {
    const own = await this.prisma.product.findFirst({
      where: { id, storeId },
      select: { imageIds: true },
    });
    if (!own) {
      throw new NotFoundException('Produto não encontrado');
    }
    return own.imageIds ?? [];
  }

  private async ownOrNotFound(storeId: string, id: string) {
    const own = await this.prisma.product.findFirst({
      where: { id, storeId },
      select: { id: true },
    });
    if (!own) {
      throw new NotFoundException('Produto não encontrado');
    }
  }

  /** A product uses a category of its own store (an old shared one still works, but the store's own wins). */
  private async categoryId(storeId: string, slug: string) {
    const category = await this.prisma.category.findFirst({
      where: { slug, OR: [{ storeId }, { storeId: null }] },
      orderBy: { storeId: { sort: 'asc', nulls: 'last' } },
    });
    if (!category) {
      throw new BadRequestException(`Unknown category: ${slug}`);
    }
    return category.id;
  }

  private translate(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException('Já existe um produto com este SKU');
      }
      if (error.code === 'P2025') {
        return new NotFoundException('Produto não encontrado');
      }
    }
    return error;
  }
}
