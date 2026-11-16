import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const EMAIL_OR_EMPTY = /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class UpdateStoreDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  tagline?: string;

  @IsOptional()
  @Matches(COLOR_PATTERN, { message: 'primaryColor must look like #2563eb' })
  primaryColor?: string;

  @IsOptional()
  @Matches(EMAIL_OR_EMPTY, { message: 'contactEmail must be an e-mail' })
  @MaxLength(120)
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string;

  // A picture uploaded by this store; null takes it off.
  @IsOptional()
  @IsUUID()
  logoImageId?: string | null;

  @IsOptional()
  @IsUUID()
  coverImageId?: string | null;
}
