import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  HIGHLIGHT_IDS,
  MAX_BANNERS,
  MAX_HIGHLIGHTS,
  PAYMENT_METHODS,
  TEMPLATES,
} from '../store-config';

export const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const EMAIL_OR_EMPTY = /^$|^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
// Digits with the usual separators and an optional leading +; 8 to 15 digits (the E.164 limit), or empty.
const PHONE_OR_EMPTY = /^$|^\+?(?:[\s().-]*\d){8,15}[\s().-]*$/;

export class HighlightDto {
  @IsIn(HIGHLIGHT_IDS)
  id: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  text?: string;
}

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
  @Matches(PHONE_OR_EMPTY, {
    message: 'contactPhone must be a phone number with 8 to 15 digits',
  })
  @MaxLength(30)
  contactPhone?: string;

  // A picture uploaded by this store; null takes it off.
  @IsOptional()
  @IsUUID()
  logoImageId?: string | null;

  // The banners in the order they are shown; an empty list takes them all off.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_BANNERS)
  @IsUUID('all', { each: true })
  bannerImageIds?: string[];

  @IsOptional()
  @IsIn(TEMPLATES)
  template?: string;

  // Draft (false) or live (true): a draft is only visible to its owner.
  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  shippingFlatCents?: number;

  // null takes the free-shipping threshold off.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  freeShippingOverCents?: number | null;

  @IsOptional()
  @IsBoolean()
  pickupEnabled?: boolean;

  // Business days to prepare an order, then the shortest and longest trip; the customer is promised this window.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  handlingDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  deliveryDaysMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  deliveryDaysMax?: number;

  // Trip days per destination state, e.g. { SC: { min: 8, max: 15 } }; checked in the service.
  @IsOptional()
  @IsObject()
  deliveryByState?: Record<string, { min: number; max: number }>;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(PAYMENT_METHODS.length)
  @IsIn(PAYMENT_METHODS, { each: true })
  paymentMethods?: string[];

  // What the store shows under its banner, in this order.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_HIGHLIGHTS)
  @ValidateNested({ each: true })
  @Type(() => HighlightDto)
  highlights?: HighlightDto[];
}
