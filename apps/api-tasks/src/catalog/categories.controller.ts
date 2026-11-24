import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedRequest } from '../auth/authenticated-user';
import { Auth } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { slugFromName } from '../stores/store-slug';
import { StoresService } from '../stores/stores.service';
import {
  CreateCategoryDto,
  RenameCategoryDto,
} from './dto/create-category.dto';

/**
 * The categories of a store are made by its owner (pants, shoes, blouses...). Every write takes the store from
 * the session and only touches categories of that store; another store's category is a plain 404.
 */
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  /** The old shared categories, kept for data that predates per-store categories. */
  @Get()
  list() {
    return this.prisma.category.findMany({
      where: { storeId: null },
      select: { slug: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  /** The categories of my store, with how many products each has. */
  @Get('mine')
  @Auth('SELLER')
  async mine(@Req() request: AuthenticatedRequest) {
    const store = await this.stores.ofSeller(request.user.id);
    const rows = await this.prisma.category.findMany({
      where: { storeId: store.id },
      select: {
        id: true,
        slug: true,
        name: true,
        _count: { select: { products: { where: { active: true } } } },
      },
      orderBy: { name: 'asc' },
    });
    return rows.map(({ _count, ...row }) => ({
      ...row,
      products: _count.products,
    }));
  }

  @Post()
  @Auth('SELLER')
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateCategoryDto,
  ) {
    const store = await this.stores.ofSeller(request.user.id);
    const name = dto.name.trim();
    const slug = dto.slug ?? slugFromName(name);
    if (!name || !slug) {
      throw new BadRequestException(
        'A category needs a name with letters or digits',
      );
    }
    try {
      return await this.prisma.category.create({
        data: { name, slug, storeId: store.id },
        select: { id: true, slug: true, name: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'You already have a category with this name',
        );
      }
      throw error;
    }
  }

  /** Renaming changes what customers read; the slug (and so every link to the category) stays. */
  @Patch(':id')
  @Auth('SELLER')
  async rename(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenameCategoryDto,
  ) {
    await this.ownOrNotFound(request.user.id, id);
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('A category needs a name');
    return this.prisma.category.update({
      where: { id },
      data: { name },
      select: { id: true, slug: true, name: true },
    });
  }

  /** A category with products cannot be deleted: its products would be left without one. */
  @Delete(':id')
  @Auth('SELLER')
  @HttpCode(204)
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.ownOrNotFound(request.user.id, id);
    const products = await this.prisma.product.count({
      where: { categoryId: id },
    });
    if (products > 0) {
      throw new ConflictException(
        `Move or remove its ${products} product${products === 1 ? '' : 's'} first`,
      );
    }
    await this.prisma.category.delete({ where: { id } });
  }

  private async ownOrNotFound(userId: string, id: string) {
    const store = await this.stores.ofSeller(userId);
    const category = await this.prisma.category.findFirst({
      where: { id, storeId: store.id },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Category not found');
  }
}
