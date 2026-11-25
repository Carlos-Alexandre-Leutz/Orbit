import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Role } from '@prisma/client';
import { ProductsService } from '../catalog/products.service';
import { StoresService } from '../stores/stores.service';
import { tripOfState } from '../orders/delivery-estimate';
import { Tool, ToolContext, ToolInputError } from './tool';
import { parseInput } from './tool-input';

/** The visitor of a store chat acts with the customer role: the policy only lists the `store.*` tools for it. */
const VISITOR_ROLES: Role[] = [Role.CUSTOMER];

const MAX_DESCRIPTION_CHARS = 300;

class SearchInput {
  @IsOptional() @IsString() @MaxLength(100) query?: string;
  @IsOptional() @IsString() @MaxLength(60) category?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10) limit?: number;
}

class DeliveryInput {
  /** The two-letter code of the destination state, when the person said it. */
  @IsOptional() @IsString() @Matches(/^[A-Za-z]{2}$/) state?: string;
}

class NoInput {}

/** Prices are shown like the storefront shows them: whole cents in the store's one currency. */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function storeOf(context: ToolContext) {
  if (!context.store) {
    throw new ToolInputError('This chat is not tied to a store');
  }
  return context.store;
}

/**
 * The tools of a store's public chat. They only read, and only the store in the context (taken from the
 * link of the page, never from the model), so a chat can never see another store. They return what the
 * storefront already shows to anyone; text the seller wrote (descriptions, highlights) is data for the
 * agent, never an instruction.
 */
export function createStoreTools(deps: {
  products: ProductsService;
  stores: StoresService;
}): Tool[] {
  const info: Tool<NoInput> = {
    name: 'store.info',
    description:
      'The store itself: name, tagline, description, contact, categories, highlights, shipping price, free-shipping threshold, pickup and delivery days.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    roles: VISITOR_ROLES,
    sideEffect: false,
    requiresApproval: false,
    parse: (input) => parseInput(NoInput, input ?? {}),
    async run(_input, context) {
      const { slug } = storeOf(context);
      const store = await deps.stores.bySlug(slug);
      const categories = await deps.stores.categoriesOf(slug);
      const highlights = Array.isArray(store.highlights)
        ? (store.highlights as { text?: string }[])
            .map((h) => h?.text)
            .filter((text): text is string => typeof text === 'string')
        : [];
      return {
        name: store.name,
        tagline: store.tagline,
        description: store.description,
        contactEmail: store.contactEmail || null,
        contactPhone: store.contactPhone || null,
        categories: categories.map((c) => c.name),
        highlights,
        shipping: {
          flatPrice: formatPrice(store.shippingFlatCents),
          freeOver:
            store.freeShippingOverCents == null
              ? null
              : formatPrice(store.freeShippingOverCents),
          pickupEnabled: store.pickupEnabled,
        },
        deliveryBusinessDays: {
          handling: store.handlingDays,
          tripMin: store.deliveryDaysMin,
          tripMax: store.deliveryDaysMax,
        },
      };
    },
    auditInput: () => ({}),
  };

  const search: Tool<SearchInput> = {
    name: 'store.search_products',
    description:
      'Searches the products of this store by words in the name or description. Returns name, price, stock, category and a short description. Without a query it lists some products.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', maxLength: 100 },
        category: { type: 'string', description: 'Category slug' },
        limit: { type: 'integer', minimum: 1, maximum: 10 },
      },
      additionalProperties: false,
    },
    roles: VISITOR_ROLES,
    sideEffect: false,
    requiresApproval: false,
    parse: (input) => parseInput(SearchInput, input ?? {}),
    async run(input, context) {
      const { slug } = storeOf(context);
      const { items, total } = await deps.products.list({
        q: input.query,
        store: slug,
        category: input.category,
        pageSize: input.limit ?? 5,
      });
      return {
        total,
        products: items.map((p) => ({
          name: p.name,
          price: formatPrice(p.priceCents),
          inStock: p.stock > 0,
          stock: p.stock,
          category: p.category?.name ?? null,
          description: p.description.slice(0, MAX_DESCRIPTION_CHARS),
        })),
      };
    },
    auditInput: (input) => ({ query: input.query ?? null }),
    auditOutput: (output) => ({ total: (output as { total: number }).total }),
  };

  const delivery: Tool<DeliveryInput> = {
    name: 'store.delivery_estimate',
    description:
      'How many business days an order takes to arrive and what shipping costs, optionally for a destination state (two-letter code). Pickup only waits for the preparation.',
    inputSchema: {
      type: 'object',
      properties: {
        state: { type: 'string', description: 'Two-letter state code' },
      },
      additionalProperties: false,
    },
    roles: VISITOR_ROLES,
    sideEffect: false,
    requiresApproval: false,
    parse: (input) => parseInput(DeliveryInput, input ?? {}),
    async run(input, context) {
      const { slug } = storeOf(context);
      const store = await deps.stores.bySlug(slug);
      const trip = tripOfState(store, input.state) ?? {
        min: store.deliveryDaysMin,
        max: store.deliveryDaysMax,
      };
      return {
        state: input.state?.toUpperCase() ?? null,
        shippingBusinessDays: {
          min: store.handlingDays + trip.min,
          max: store.handlingDays + trip.max,
        },
        pickup: store.pickupEnabled
          ? { readyInBusinessDays: store.handlingDays }
          : null,
        shippingPrice: formatPrice(store.shippingFlatCents),
        freeShippingOver:
          store.freeShippingOverCents == null
            ? null
            : formatPrice(store.freeShippingOverCents),
        note: 'Business days run Monday to Friday; holidays are not counted.',
      };
    },
    auditInput: (input) => ({ state: input.state ?? null }),
  };

  return [info, search, delivery] as Tool[];
}
