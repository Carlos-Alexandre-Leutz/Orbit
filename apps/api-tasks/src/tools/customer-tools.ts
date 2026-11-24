import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Role } from '@prisma/client';
import { CartService } from '../cart/cart.service';
import { ProductsService } from '../catalog/products.service';
import { OrdersService } from '../orders/orders.service';
import { DELIVERY_METHODS } from '../stores/store-config';
import type { DeliveryMethod } from '../stores/store-config';
import { Tool } from './tool';
import { parseInput } from './tool-input';

const CUSTOMER_ROLES: Role[] = [Role.CUSTOMER, Role.SELLER];

class SearchInput {
  @IsOptional() @IsString() @MaxLength(100) query?: string;
  /** The slug of the store. */
  @IsOptional() @IsString() @MaxLength(40) store?: string;
  @IsOptional() @IsString() @MaxLength(60) category?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20) limit?: number;
}

class StoreInput {
  @IsUUID() storeId: string;
}

class AddItemInput extends StoreInput {
  @IsUUID() productId: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(99) quantity: number;
}

class AddressInput {
  @IsString() @MinLength(2) @MaxLength(120) recipientName: string;
  @IsString() @Matches(/^[0-9()+\-\s]{8,20}$/) recipientPhone: string;
  @IsString() @Matches(/^\d{5}-?\d{3}$/) postalCode: string;
  @IsString() @MinLength(2) @MaxLength(150) street: string;
  @IsString() @MinLength(1) @MaxLength(20) number: string;
  @IsOptional() @IsString() @MaxLength(80) complement?: string;
  @IsString() @MinLength(2) @MaxLength(80) district: string;
  @IsString() @MinLength(2) @MaxLength(80) city: string;
  @IsString() @Matches(/^[A-Za-z]{2}$/) state: string;
}

class PlaceOrderInput extends StoreInput {
  @IsIn(DELIVERY_METHODS) delivery: DeliveryMethod;
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressInput)
  address?: AddressInput;
}

class OrderInput {
  @IsUUID() orderId: string;
}

const uuid = { type: 'string', format: 'uuid' };

/**
 * The tools a customer's agent may use. Every one acts as the signed-in user and goes through the same
 * services as the web pages, so the store rules (stock, limits, who sees an order) apply unchanged.
 * What they return is data from the store, including text sellers wrote: an agent must never read it as
 * an instruction. Product descriptions are left out on purpose.
 */
export function createCustomerTools(deps: {
  products: ProductsService;
  cart: CartService;
  orders: OrdersService;
}): Tool[] {
  const search: Tool<SearchInput> = {
    name: 'catalog.search',
    description:
      'Searches the products on sale. Returns id, store, name, price in cents and stock.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', maxLength: 100 },
        store: { type: 'string', description: 'Store slug' },
        category: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 20 },
      },
      additionalProperties: false,
    },
    roles: CUSTOMER_ROLES,
    sideEffect: false,
    requiresApproval: false,
    parse: (input) => parseInput(SearchInput, input),
    async run(input) {
      const { items, total } = await deps.products.list({
        q: input.query,
        store: input.store,
        category: input.category,
        pageSize: input.limit ?? 10,
        inStock: true,
      });
      return {
        total,
        products: items.map((p) => ({
          id: p.id,
          storeId: p.storeId,
          sku: p.sku,
          name: p.name,
          priceCents: p.priceCents,
          stock: p.stock,
        })),
      };
    },
    auditInput: (input) => ({
      query: input.query ?? null,
      store: input.store ?? null,
    }),
    auditOutput: (output) => ({ total: (output as { total: number }).total }),
  };

  const viewCart: Tool<StoreInput> = {
    name: 'cart.view',
    description: 'Shows the cart of the user in a store.',
    inputSchema: {
      type: 'object',
      properties: { storeId: uuid },
      required: ['storeId'],
      additionalProperties: false,
    },
    roles: CUSTOMER_ROLES,
    sideEffect: false,
    requiresApproval: false,
    parse: (input) => parseInput(StoreInput, input),
    run: (input, ctx) => deps.cart.view(ctx.actor.id, input.storeId),
    auditInput: (input) => ({ storeId: input.storeId }),
  };

  const addItem: Tool<AddItemInput> = {
    name: 'cart.add_item',
    description: 'Adds units of a product to the cart. Returns the cart.',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: uuid,
        productId: uuid,
        quantity: { type: 'integer', minimum: 1, maximum: 99 },
      },
      required: ['storeId', 'productId', 'quantity'],
      additionalProperties: false,
    },
    roles: CUSTOMER_ROLES,
    sideEffect: true,
    requiresApproval: false,
    parse: (input) => parseInput(AddItemInput, input),
    run: (input, ctx) =>
      deps.cart.add(
        ctx.actor.id,
        input.storeId,
        input.productId,
        input.quantity,
      ),
    auditInput: (input) => ({
      storeId: input.storeId,
      productId: input.productId,
      quantity: input.quantity,
    }),
  };

  const placeOrder: Tool<PlaceOrderInput> = {
    name: 'orders.place',
    description:
      'Buys what is in the cart: creates the order, to be paid afterwards. A human must approve it first. Needs an address when the delivery is SHIPPING.',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: uuid,
        delivery: { type: 'string', enum: [...DELIVERY_METHODS] },
        address: {
          type: 'object',
          properties: {
            recipientName: { type: 'string' },
            recipientPhone: { type: 'string' },
            postalCode: { type: 'string' },
            street: { type: 'string' },
            number: { type: 'string' },
            complement: { type: 'string' },
            district: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string', minLength: 2, maxLength: 2 },
          },
          required: [
            'recipientName',
            'recipientPhone',
            'postalCode',
            'street',
            'number',
            'district',
            'city',
            'state',
          ],
        },
      },
      required: ['storeId', 'delivery'],
      additionalProperties: false,
    },
    roles: CUSTOMER_ROLES,
    sideEffect: true,
    requiresApproval: true,
    parse: (input) => parseInput(PlaceOrderInput, input),
    run: (input, ctx) =>
      deps.orders.createFromCart(
        ctx.actor.id,
        input.storeId,
        ctx.idempotencyKey,
        input.delivery,
        input.address,
      ),
    // The address is personal data: the audit log keeps only that one was given.
    auditInput: (input) => ({
      storeId: input.storeId,
      delivery: input.delivery,
      hasAddress: Boolean(input.address),
    }),
    auditOutput: (output) => {
      const order = output as { id: string; totalCents: number };
      return { orderId: order.id, totalCents: order.totalCents };
    },
  };

  const status: Tool<OrderInput> = {
    name: 'orders.status',
    description:
      'Shows an order of the user: status, items, tracking code and delivery estimate.',
    inputSchema: {
      type: 'object',
      properties: { orderId: uuid },
      required: ['orderId'],
      additionalProperties: false,
    },
    roles: CUSTOMER_ROLES,
    sideEffect: false,
    requiresApproval: false,
    parse: (input) => parseInput(OrderInput, input),
    // Without `storeId` the viewer is just a customer: only the user's own orders are visible.
    run: (input, ctx) =>
      deps.orders.get(input.orderId, { id: ctx.actor.id, role: Role.CUSTOMER }),
    auditInput: (input) => ({ orderId: input.orderId }),
  };

  const cancel: Tool<OrderInput> = {
    name: 'orders.cancel',
    description:
      'Cancels an order that was not shipped yet and returns the stock; a paid order is refunded. A human must approve it first.',
    inputSchema: {
      type: 'object',
      properties: { orderId: uuid },
      required: ['orderId'],
      additionalProperties: false,
    },
    roles: CUSTOMER_ROLES,
    sideEffect: true,
    requiresApproval: true,
    parse: (input) => parseInput(OrderInput, input),
    run: (input, ctx) =>
      deps.orders.cancel(input.orderId, {
        id: ctx.actor.id,
        role: Role.CUSTOMER,
      }),
    auditInput: (input) => ({ orderId: input.orderId }),
    auditOutput: (output) => ({
      status: (output as { status: string }).status,
    }),
  };

  return [search, viewCart, addItem, placeOrder, status, cancel] as Tool[];
}
