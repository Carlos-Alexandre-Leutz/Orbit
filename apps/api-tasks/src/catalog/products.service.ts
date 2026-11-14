import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsDto, ProductSort } from './dto/list-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const WITH_CATEGORY = { category: { select: { slug: true, name: true } } };
const DEFAULT_PAGE_SIZE = 20;

const ORDER: Record<ProductSort, Prisma.ProductOrderByWithRelationInput[]> = {
  name: [{ name: 'asc' }, { id: 'asc' }],
  price_asc: [{ priceCents: 'asc' }, { name: 'asc' }, { id: 'asc' }],
  price_desc: [{ priceCents: 'desc' }, { name: 'asc' }, { id: 'asc' }],
  newest: [{ createdAt: 'desc' }, { id: 'asc' }],
};

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

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
    const words = (query.q ?? '').split(/\s+/).filter(Boolean).slice(0, 8);
    return {
      active: true,
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

  async create(dto: CreateProductDto) {
    const { categorySlug, ...data } = dto;
    const categoryId = await this.categoryId(categorySlug);
    try {
      return await this.prisma.product.create({
        data: { ...data, categoryId },
        include: WITH_CATEGORY,
      });
    } catch (error) {
      throw this.translate(error);
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    const { categorySlug, ...data } = dto;
    const categoryId = categorySlug
      ? await this.categoryId(categorySlug)
      : undefined;
    try {
      return await this.prisma.product.update({
        where: { id },
        data: { ...data, ...(categoryId ? { categoryId } : {}) },
        include: WITH_CATEGORY,
      });
    } catch (error) {
      throw this.translate(error);
    }
  }

  /** Hides the product; the row stays so orders that point at it keep working. */
  async remove(id: string) {
    try {
      await this.prisma.product.update({
        where: { id },
        data: { active: false },
      });
    } catch (error) {
      throw this.translate(error);
    }
  }

  private async categoryId(slug: string) {
    const category = await this.prisma.category.findUnique({ where: { slug } });
    if (!category) {
      throw new BadRequestException(`Categoria desconhecida: ${slug}`);
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
