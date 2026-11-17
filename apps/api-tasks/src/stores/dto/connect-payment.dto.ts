import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { PAYMENT_PROVIDERS } from '../store-config';

/** What a seller pastes to connect their own payment provider (ADR-008). */
export class ConnectPaymentDto {
  @IsIn(PAYMENT_PROVIDERS)
  provider: string;

  // The secret key (Stripe) or the access token (Mercado Pago). Stored encrypted, never sent back.
  @IsString()
  @MinLength(8)
  @MaxLength(300)
  secretKey: string;

  // The public key (Stripe's pk_..., Mercado Pago's public key): the browser needs it to read the card.
  @IsString()
  @MinLength(8)
  @MaxLength(300)
  publicKey: string;

  // The secret that signs the provider's webhook calls. Stored encrypted, never sent back.
  @IsString()
  @MinLength(8)
  @MaxLength(300)
  webhookSecret: string;
}
