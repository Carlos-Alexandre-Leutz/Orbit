import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  // bcrypt only uses the first 72 bytes.
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  // The role itself is never read from the request: only the choice between buying and selling.
  @IsOptional()
  @IsIn(['CUSTOMER', 'SELLER'])
  accountType?: 'CUSTOMER' | 'SELLER';

  // Required when accountType is SELLER; the link is suggested from the name when left out.
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  storeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  storeSlug?: string;
}
