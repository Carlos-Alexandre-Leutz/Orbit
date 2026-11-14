import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase words joined by "-"',
  })
  @MaxLength(60)
  slug: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;
}
