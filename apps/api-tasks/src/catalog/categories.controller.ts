import { Body, ConflictException, Controller, Get, Post } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Auth } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.category.findMany({
      select: { slug: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  @Post()
  @Auth('SELLER', 'ADMIN')
  async create(@Body() dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({
        data: dto,
        select: { slug: true, name: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Já existe uma categoria com este slug');
      }
      throw error;
    }
  }
}
