import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { callStoreApi } from '../upstream';
import {
  CategoryDto,
  CreateCategoryBody,
  CreateProductBody,
  ProductDto,
  ProductPageDto,
  UpdateProductBody,
} from './dto';

/** The catalog for the browser. Reading is public; writing needs a seller or admin session, checked by the store API. */
@ApiTags('catalog')
@Controller()
export class CatalogController {
  constructor(private readonly http: HttpService) {}

  @Get('products')
  @ApiOperation({ summary: 'List active products, paged' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false, description: 'At most 100' })
  @ApiResponse({ status: 200, type: ProductPageDto })
  list(@Query() query: Record<string, unknown>) {
    return callStoreApi(this.http, 'get', '/products', {
      query,
      fallback: 'Erro ao listar produtos',
    });
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Read one active product' })
  @ApiResponse({ status: 200, type: ProductDto })
  @ApiResponse({ status: 404, description: 'Unknown or removed product' })
  get(@Param('id') id: string) {
    return callStoreApi(
      this.http,
      'get',
      `/products/${encodeURIComponent(id)}`,
      {
        fallback: 'Erro ao carregar o produto',
      },
    );
  }

  @Post('products')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a product (seller or admin)' })
  @ApiResponse({ status: 201, type: ProductDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or unknown category',
  })
  @ApiResponse({ status: 401, description: 'No session' })
  @ApiResponse({ status: 403, description: 'Not a seller or admin' })
  @ApiResponse({ status: 409, description: 'SKU already used' })
  create(
    @Body() body: CreateProductBody,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(this.http, 'post', '/products', {
      body,
      authorization,
      fallback: 'Erro ao criar o produto',
    });
  }

  @Patch('products/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change a product; the SKU cannot change (seller or admin)',
  })
  @ApiResponse({ status: 200, type: ProductDto })
  update(
    @Param('id') id: string,
    @Body() body: UpdateProductBody,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(
      this.http,
      'patch',
      `/products/${encodeURIComponent(id)}`,
      {
        body,
        authorization,
        fallback: 'Erro ao alterar o produto',
      },
    );
  }

  @Delete('products/:id')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Remove a product: it is hidden, not deleted (seller or admin)',
  })
  @ApiResponse({ status: 204 })
  remove(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(
      this.http,
      'delete',
      `/products/${encodeURIComponent(id)}`,
      {
        authorization,
        fallback: 'Erro ao remover o produto',
      },
    );
  }

  @Get('categories')
  @ApiOperation({ summary: 'List categories' })
  @ApiResponse({ status: 200, type: [CategoryDto] })
  categories() {
    return callStoreApi(this.http, 'get', '/categories', {
      fallback: 'Erro ao listar categorias',
    });
  }

  @Post('categories')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a category (seller or admin)' })
  @ApiResponse({ status: 201, type: CategoryDto })
  createCategory(
    @Body() body: CreateCategoryBody,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(this.http, 'post', '/categories', {
      body,
      authorization,
      fallback: 'Erro ao criar a categoria',
    });
  }
}
