import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryDto {
  @ApiProperty({ example: 'kitchen' })
  slug: string;

  @ApiProperty({ example: 'Kitchen' })
  name: string;
}

export class ProductDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'KIT-001' })
  sku: string;

  @ApiProperty({ example: 'Cast iron skillet, 26 cm' })
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ description: 'Price in cents', example: 3490 })
  priceCents: number;

  @ApiProperty({ example: 40 })
  stock: number;

  @ApiProperty()
  active: boolean;

  @ApiProperty({ type: CategoryDto })
  category: CategoryDto;
}

export class ProductPageDto {
  @ApiProperty({ type: [ProductDto] })
  items: ProductDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;
}

export class CreateProductBody {
  @ApiProperty({
    description: '3 to 40 characters: A-Z, 0-9, - or _',
    example: 'KIT-900',
  })
  sku: string;

  @ApiProperty({ maxLength: 120 })
  name: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  description?: string;

  @ApiProperty({ description: 'Price in cents, 0 to 100000000', minimum: 0 })
  priceCents: number;

  @ApiProperty({ description: 'Units in stock, 0 to 1000000', minimum: 0 })
  stock: number;

  @ApiProperty({
    description: 'Slug of an existing category',
    example: 'kitchen',
  })
  categorySlug: string;

  @ApiPropertyOptional()
  active?: boolean;
}

export class UpdateProductBody {
  @ApiPropertyOptional() name?: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional({ minimum: 0 }) priceCents?: number;
  @ApiPropertyOptional({ minimum: 0 }) stock?: number;
  @ApiPropertyOptional() categorySlug?: string;
  @ApiPropertyOptional() active?: boolean;
}

export class CreateCategoryBody {
  @ApiProperty({
    description: 'Lowercase words joined by -',
    example: 'garden',
  })
  slug: string;

  @ApiProperty({ example: 'Garden' })
  name: string;
}
