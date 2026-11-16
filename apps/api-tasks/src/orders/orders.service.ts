import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PaymentsService } from '../payments/payments.service';
import { OrderWithItems, presentOrder, WITH_ITEMS } from './order-presenter';
import { canTransition, TIMESTAMP_OF } from './order-state';

/** Who is asking. A seller carries the id of the store they own, found from the session by the controller. */
export interface Viewer {
  id: string;
  role: Role;
  storeId?: string;
}

/** Staff of an order: an admin, or the seller of the store the order belongs to. */
function isStaffOf(viewer: Viewer, order: { storeId: string }) {
  return (
    viewer.role === 'ADMIN' ||
    (viewer.role === 'SELLER' && viewer.storeId === order.storeId)
  );
}

function refuse(code: string, message: string, extra: object = {}) {
  return new ConflictException({ statusCode: 409, message, code, ...extra });
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly mail: MailService,
  ) {}

  /**
   * Turns the cart into an order in one transaction: the cart row is locked, the stock is taken with a
   * conditional update that cannot go below zero, the products and prices are copied onto the order, and the
   * cart is emptied. If anything fails nothing is kept: the stock and the cart stay as they were.
   *
   * With an idempotency key, a retry returns the order that key already created instead of a second one, even
   * when the cart is empty by then. Two parallel requests with the same key queue on the cart lock, and the
   * second finds the first one's order. The unique index on (user, key) is the last guard.
   */
  async createFromCart(
    userId: string,
    storeId: string,
    idempotencyKey?: string,
  ) {
    if (idempotencyKey) {
      const existing = await this.findByKey(userId, idempotencyKey);
      if (existing) {
        return presentOrder(existing);
      }
    }
    const cart = await this.prisma.cart.findUnique({
      where: { userId_storeId: { userId, storeId } },
    });
    if (!cart) {
      throw refuse('EMPTY_CART', 'O carrinho está vazio');
    }
    try {
      const { order, created } = await this.placeOrder(
        userId,
        storeId,
        cart.id,
        idempotencyKey,
      );
      if (created) {
        await this.linkCustomer(userId, storeId);
        this.notifyPlaced(userId, order);
      }
      return presentOrder(order);
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

  /** Buying makes the customer a customer of the store, so its seller can see them (and only them). */
  private linkCustomer(userId: string, storeId: string) {
    return this.prisma.storeCustomer.upsert({
      where: { storeId_userId: { storeId, userId } },
      update: {},
      create: { storeId, userId },
    });
  }

  /**
   * Sends the confirmation e-mail after the order is saved. It is not awaited and its failure is only logged:
   * a slow or broken mail server must never delay or fail an order. Visitor accounts have no real address.
   */
  private notifyPlaced(userId: string, order: OrderWithItems) {
    void (async () => {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, isAnonymous: true },
      });
      if (!user || user.isAnonymous) {
        return;
      }
      await this.mail.sendOrderConfirmation(user.email, order);
    })().catch((error: unknown) =>
      this.logger.warn(
        `Could not send the confirmation of order ${order.id}: ${String(error)}`,
      ),
    );
  }

  private findByKey(userId: string, idempotencyKey: string) {
    return this.prisma.order.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      include: WITH_ITEMS,
    });
  }

  private async placeOrder(
    userId: string,
    storeId: string,
    cartId: string,
    idempotencyKey?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Cart" WHERE id = ${cartId} FOR UPDATE`;
      if (idempotencyKey) {
        const existing = await tx.order.findUnique({
          where: { userId_idempotencyKey: { userId, idempotencyKey } },
          include: WITH_ITEMS,
        });
        if (existing) {
          return { order: existing, created: false };
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
          storeId,
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
      return { order: created, created: true };
    });
  }

  /** My orders, newest first; with a store, only the ones placed in that store. */
  async listMine(userId: string, storeId?: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId, ...(storeId ? { storeId } : {}) },
      include: WITH_ITEMS,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: 100,
    });
    return orders.map(presentOrder);
  }

  /**
   * An order is visible to its owner, to an admin and to the seller of its store. For anyone else,
   * including the seller of another store, it does not exist.
   */
  async get(id: string, viewer: Viewer) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: WITH_ITEMS,
    });
    if (!order || (order.userId !== viewer.id && !isStaffOf(viewer, order))) {
      throw new NotFoundException('Pedido não encontrado');
    }
    return presentOrder(order);
  }

  /**
   * Moves an order to a new state if the move is allowed and the order is still in the state the caller saw.
   * The update names the old state, so two requests cannot both win.
   */
  async transition(
    id: string,
    to: OrderStatus,
    viewer: Viewer,
    from?: OrderStatus,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order || !isStaffOf(viewer, order)) {
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

  /**
   * Cancels an order. The customer may cancel their own order only while it waits for payment. A seller or
   * admin may also cancel a paid one, which is refunded. Shipped and delivered orders cannot be cancelled.
   * The state change and the return of the stock happen in one transaction, and the state change names the
   * old state, so the stock goes back exactly once. Cancelling a cancelled order changes nothing.
   */
  async cancel(id: string, viewer: Viewer) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: WITH_ITEMS,
    });
    const staff = !!order && isStaffOf(viewer, order);
    if (!order || (order.userId !== viewer.id && !staff)) {
      throw new NotFoundException('Pedido não encontrado');
    }
    if (order.status === 'CANCELLED') {
      if (staff) {
        await this.refundIfNeeded(order.id);
      }
      return this.reload(order.id);
    }
    if (!canTransition(order.status, 'CANCELLED')) {
      throw refuse(
        'INVALID_TRANSITION',
        `Um pedido ${order.status} não pode ser cancelado`,
        { from: order.status, to: 'CANCELLED' },
      );
    }
    if (!staff && order.status !== 'PENDING_PAYMENT') {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'CANCEL_NEEDS_STAFF',
        message: 'Um pedido pago só pode ser cancelado pela loja',
      });
    }
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id, status: order.status },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
      if (count === 0) {
        throw refuse(
          'STATE_CHANGED',
          'O pedido mudou de estado; tente de novo',
        );
      }
      // Fixed product order, so two cancellations that share products cannot deadlock.
      const lines = [...order.items].sort((a, b) =>
        a.productId.localeCompare(b.productId),
      );
      for (const { productId, quantity } of lines) {
        await tx.product.update({
          where: { id: productId },
          data: { stock: { increment: quantity } },
        });
      }
    });
    if (order.status === 'PAID') {
      await this.refundIfNeeded(order.id);
    }
    return this.reload(order.id);
  }

  /** The order is already cancelled when this runs, so a failed refund is reported but never undone. */
  private async refundIfNeeded(id: string) {
    try {
      await this.payments.refundOrder(id);
    } catch {
      throw new HttpException(
        {
          statusCode: 502,
          code: 'REFUND_FAILED',
          message:
            'O pedido foi cancelado, mas o estorno falhou; cancele de novo para tentar o estorno',
        },
        502,
      );
    }
  }

  private async reload(id: string) {
    return presentOrder(
      await this.prisma.order.findUniqueOrThrow({
        where: { id },
        include: WITH_ITEMS,
      }),
    );
  }
}
