import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/** Where a shipped order goes. It is copied onto the order, so a later change of the customer never moves it. */
export class ShippingAddressDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  recipientName: string;

  @IsString()
  @Matches(/^[0-9()+\-\s]{8,20}$/, { message: 'recipientPhone is not valid' })
  recipientPhone: string;

  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, { message: 'postalCode must look like 01310-100' })
  postalCode: string;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  street: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  number: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  complement?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  district: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city: string;

  @IsString()
  @Matches(/^[A-Za-z]{2}$/, { message: 'state must be 2 letters' })
  state: string;
}

export class PlaceOrderDto {
  /** Required for a shipped order, ignored for a pickup. */
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;
}

export class ShipOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  trackingCode?: string;
}

export class InvoiceOrderDto {
  /** The link to the tax invoice; an empty text takes it off. Only https links, because the customer clicks it. */
  @IsString()
  @MaxLength(500)
  @ValidateIf((_, value) => value !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true })
  invoiceUrl: string;
}
