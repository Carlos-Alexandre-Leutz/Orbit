import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class RecordPaymentDto {
  // How many months the seller paid for; a plain monthly payment is 1.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  months?: number;

  // Free text for the admin's own memory, such as "Pix on the 16th".
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class SuspendStoreDto {
  // Why, so the record says it. Shown to nobody else.
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  reason: string;
}

export class SetPriceDto {
  // In the cents of the plan's currency: R$ 15,00 is 1500. From R$ 1 to R$ 10.000.
  @IsInt()
  @Min(100)
  @Max(1_000_000)
  priceCents: number;
}
