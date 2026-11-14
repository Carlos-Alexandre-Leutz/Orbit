import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const SKU_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,39}$/;
const MAX_PRICE_CENTS = 100_000_000;
const MAX_STOCK = 1_000_000;

export class CreateProductDto {
  @Matches(SKU_PATTERN, {
    message: 'sku must be 3 to 40 characters: A-Z, 0-9, "-" or "_"',
  })
  sku: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsInt()
  @Min(0)
  @Max(MAX_PRICE_CENTS)
  priceCents: number;

  @IsInt()
  @Min(0)
  @Max(MAX_STOCK)
  stock: number;

  @IsString()
  @MinLength(1)
  categorySlug: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
