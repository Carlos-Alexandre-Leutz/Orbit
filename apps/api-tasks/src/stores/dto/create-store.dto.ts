import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SELLING_MODES, TEMPLATES } from '../store-config';

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

  @IsOptional()
  @IsIn(TEMPLATES)
  template?: string;

  // What the seller wants to do, asked once at the start.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(SELLING_MODES.length)
  @IsIn(SELLING_MODES, { each: true })
  sellingModes?: string[];
}
