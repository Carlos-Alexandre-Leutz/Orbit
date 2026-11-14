import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { brokenRule } from './cart-rules';

const WITH_PRODUCT = {
  items: {
    include: { product: true },
    orderBy: [{ product: { name: 'asc' } }, { id: 'asc' }],
  },
} satisfies Prisma.CartInclude;

type CartWithProducts = Prisma.CartGetPayload<{ include: typeof WITH_PRODUCT }>;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  /** Every user has exactly one cart; it is created the first time it is needed. */
  private async cartOf(userId: string) {
    return this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async view(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: WITH_PRODUCT,
    });
    return this.present(cart);
  }

  /**
   * Adds units, refusing what the rules forbid. The cart row is locked while the change is checked and
   * written, so two requests for the same cart (two tabs, a double click) are handled one after the other
   * and can never push the cart past its limits together.
   */
  async add(userId: string, productId: string, quantity: number) {
    await this.change(userId, productId, (current) => current + quantity, true);
    return this.view(userId);
  }

  /** Sets the quantity of a line that is already in the cart. Repeating it changes nothing. */
  async setQuantity(userId: string, productId: string, quantity: number) {
    await this.change(userId, productId, () => quantity, false);
    return this.view(userId);
  }

  private async change(
    userId: string,
    productId: string,
    next: (current: number) => number,
    createIfMissing: boolean,
  ) {
    const cart = await this.cartOf(userId);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Cart" WHERE id = ${cart.id} FOR UPDATE`;
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new NotFoundException('Produto não encontrado');
      }
      const line = await tx.cartItem.findUnique({
        where: { cartId_productId: { cartId: cart.id, productId } },
      });
      if (!line && !createIfMissing) {
        throw new NotFoundException('Este produto não está no carrinho');
      }
      const resulting = next(line?.quantity ?? 0);
      const broken = brokenRule({
        resulting,
        stock: product.stock,
        active: product.active,
        lines: await tx.cartItem.count({ where: { cartId: cart.id } }),
        alreadyInCart: Boolean(line),
      });
      if (broken) {
        throw new ConflictException({
          statusCode: 409,
          message: broken.message,
          code: broken.code,
        });
      }
      await tx.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId } },
        create: { cartId: cart.id, productId, quantity: resulting },
        update: { quantity: resulting },
      });
    });
  }

  async remove(userId: string, productId: string) {
    const cart = await this.cartOf(userId);
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id, productId },
    });
  }

  async clear(userId: string) {
    const cart = await this.cartOf(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }

  /**
   * The cart as the customer sees it. A line is `available` when its product is still on sale and
   * there is enough stock; only available lines count towards the total.
   */
  private present(cart: CartWithProducts | null) {
    const items = (cart?.items ?? []).map(({ product, quantity }) => {
      const available = product.active && product.stock >= quantity;
      return {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        priceCents: product.priceCents,
        quantity,
        stock: product.stock,
        available,
        lineTotalCents: product.priceCents * quantity,
      };
    });
    const counted = items.filter((item) => item.available);
    return {
      items,
      itemCount: counted.reduce((sum, item) => sum + item.quantity, 0),
      totalCents: counted.reduce((sum, item) => sum + item.lineTotalCents, 0),
    };
  }
}
