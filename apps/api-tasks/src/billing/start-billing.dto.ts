import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class StartBillingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  cardToken!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  payerEmail?: string;
}
