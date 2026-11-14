import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const WITH_CATEGORY = { category: { select: { slug: true, name: true } } };
const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListProductsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where: Prisma.ProductWhereInput = { active: true };
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: WITH_CATEGORY,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total, page, pageSize };
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
