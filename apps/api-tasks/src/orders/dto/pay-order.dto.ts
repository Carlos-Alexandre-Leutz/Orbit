import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class PayOrderDto {
  /** Stripe: the id of the card made in the browser, like `pm_...` (or a test one such as `pm_card_visa`). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^pm_[A-Za-z0-9_]+$/, { message: 'paymentMethod is not valid' })
  paymentMethod?: string;

  /** Mercado Pago: the one-time card token made in the browser. */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{8,100}$/, { message: 'cardToken is not valid' })
  cardToken?: string;

  /** Mercado Pago: the card brand the token was made for, like `visa` or `master`. */
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_]{2,30}$/, { message: 'cardBrand is not valid' })
  cardBrand?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  payerEmail?: string;
}
