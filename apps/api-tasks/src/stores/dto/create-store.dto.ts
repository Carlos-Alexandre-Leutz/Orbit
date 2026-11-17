import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  // Suggested from the name when left out.
  @IsOptional()
  @IsString()
  @MaxLength(60)
  slug?: string;
}
