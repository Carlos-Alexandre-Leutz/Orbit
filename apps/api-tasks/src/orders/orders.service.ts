import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { canTransition, TIMESTAMP_OF } from './order-state';

export const WITH_ITEMS = { items: { orderBy: { name: 'asc' as const } } };
type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof WITH_ITEMS }>;

/** What the API shows of an order. */
export function presentOrder(order: OrderWithItems) {
  return {
    id: order.id,
    status: order.status,
    currency: order.currency,
    totalCents: order.totalCents,
    items: order.items.map((item) => ({
      productId: item.productId,
      sku: item.sku,
      name: item.name,
      priceCents: item.priceCents,
      quantity: item.quantity,
      lineTotalCents: item.priceCents * item.quantity,
    })),
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    shippedAt: order.shippedAt,
    deliveredAt: order.deliveredAt,
    cancelledAt: order.cancelledAt,
  };
}

function refuse(code: string, message: string, extra: object = {}) {
  return new ConflictException({ statusCode: 409, message, code, ...extra });
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Turns the cart into an order in one transaction: the cart row is locked, the stock is taken with a
   * conditional update that cannot go below zero, the products and prices are copied onto the order, and the
   * cart is emptied. If anything fails nothing is kept: the stock and the cart stay as they were.
   *
   * With an idempotency key, a retry returns the order that key already created instead of a second one, even
   * when the cart is empty by then. Two parallel requests with the same key queue on the cart lock, and the
   * second finds the first one's order. The unique index on (user, key) is the last guard.
   */
  async createFromCart(userId: string, idempotencyKey?: string) {
    if (idempotencyKey) {
      const existing = await this.findByKey(userId, idempotencyKey);
      if (existing) {
        return presentOrder(existing);
      }
    }
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      throw refuse('EMPTY_CART', 'O carrinho está vazio');
    }
    try {
      return await this.placeOrder(userId, cart.id, idempotencyKey);
    } catch (error) {
      if (
        idempotencyKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const winner = await this.findByKey(userId, idempotencyKey);
        if (winner) {
          return presentOrder(winner);
        }
      }
      throw error;
    }
  }

  private findByKey(userId: string, idempotencyKey: string) {
    return this.prisma.order.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      include: WITH_ITEMS,
    });
  }

  private async placeOrder(
    userId: string,
    cartId: string,
    idempotencyKey?: string,
  ) {
    const order = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Cart" WHERE id = ${cartId} FOR UPDATE`;
      if (idempotencyKey) {
        const existing = await tx.order.findUnique({
          where: { userId_idempotencyKey: { userId, idempotencyKey } },
          include: WITH_ITEMS,
        });
        if (existing) {
          return existing;
        }
      }
      // Products are locked in a fixed order, so two orders that share products cannot deadlock.
      const lines = await tx.cartItem.findMany({
        where: { cartId },
        include: { product: true },
        orderBy: { productId: 'asc' },
      });
      if (lines.length === 0) {
        throw refuse('EMPTY_CART', 'O carrinho está vazio');
      }
      for (const { product, quantity } of lines) {
        if (!product.active) {
          throw refuse('UNAVAILABLE', `${product.name} não está mais à venda`, {
            productId: product.id,
          });
        }
        const taken = await tx.product.updateMany({
          where: { id: product.id, active: true, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });
        if (taken.count === 0) {
          throw refuse(
            'NOT_ENOUGH_STOCK',
            `Não há estoque suficiente de ${product.name}`,
            { productId: product.id },
          );
        }
      }
      const created = await tx.order.create({
        data: {
          userId,
          idempotencyKey,
          totalCents: lines.reduce(
            (sum, l) => sum + l.product.priceCents * l.quantity,
            0,
          ),
          items: {
            create: lines.map(({ product, quantity }) => ({
              productId: product.id,
              sku: product.sku,
              name: product.name,
              priceCents: product.priceCents,
              quantity,
            })),
          },
        },
        include: WITH_ITEMS,
      });
      await tx.cartItem.deleteMany({ where: { cartId } });
      return created;
    });
    return presentOrder(order);
  }

  async listMine(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: WITH_ITEMS,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: 100,
    });
    return orders.map(presentOrder);
  }

  /** An order is visible to its owner and to an admin. For anyone else it does not exist. */
  async get(id: string, viewer: { id: string; role: Role }) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: WITH_ITEMS,
    });
    if (!order || (order.userId !== viewer.id && viewer.role !== 'ADMIN')) {
      throw new NotFoundException('Pedido não encontrado');
    }
    return presentOrder(order);
  }

  /**
   * Moves an order to a new state if the move is allowed and the order is still in the state the caller saw.
   * The update names the old state, so two requests cannot both win.
   */
  async transition(id: string, to: OrderStatus, from?: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }
    const current = from ?? order.status;
    if (!canTransition(current, to)) {
      throw refuse(
        'INVALID_TRANSITION',
        `Um pedido ${current} não pode passar para ${to}`,
        { from: current, to },
      );
    }
    const column = TIMESTAMP_OF[to];
    const { count } = await this.prisma.order.updateMany({
      where: { id, status: current },
      data: {
        status: to,
        ...(column ? { [column]: new Date() } : {}),
      },
    });
    if (count === 0) {
      throw refuse('STATE_CHANGED', 'O pedido mudou de estado; tente de novo');
    }
    const updated = await this.prisma.order.findUniqueOrThrow({
      where: { id },
      include: WITH_ITEMS,
    });
    return presentOrder(updated);
  }
}
