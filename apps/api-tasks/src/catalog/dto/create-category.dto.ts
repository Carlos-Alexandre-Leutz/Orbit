import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  // Made from the name when left out.
  @IsOptional()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase words joined by "-"',
  })
  @MaxLength(60)
  slug?: string;
}

export class RenameCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;
}
