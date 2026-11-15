import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class PayOrderDto {
  /** A test payment method id, like `pm_card_visa`. Optional: the default always succeeds. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^pm_[A-Za-z0-9_]+$/, { message: 'paymentMethod is not valid' })
  paymentMethod?: string;
}
