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

  /**
   * A customer has one cart per store; it is created the first time it is needed. Two requests that
   * arrive together for a new user both try to create it, and the database lets only one win, so the
   * loser reads the cart the winner made instead of failing.
   */
  private async cartOf(userId: string, storeId: string) {
    const where = { userId_storeId: { userId, storeId } };
    try {
      return await this.prisma.cart.upsert({
        where,
        update: {},
        create: { userId, storeId },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.prisma.cart.findUniqueOrThrow({ where });
      }
      throw error;
    }
  }

  async view(userId: string, storeId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId_storeId: { userId, storeId } },
      include: WITH_PRODUCT,
    });
    return this.present(cart);
  }

  /**
   * Adds units, refusing what the rules forbid. The cart row is locked while the change is checked and
   * written, so two requests for the same cart (two tabs, a double click) are handled one after the other
   * and can never push the cart past its limits together.
   */
  async add(
    userId: string,
    storeId: string,
    productId: string,
    quantity: number,
  ) {
    await this.change(
      userId,
      storeId,
      productId,
      (current) => current + quantity,
      true,
    );
    return this.view(userId, storeId);
  }

  /** Sets the quantity of a line that is already in the cart. Repeating it changes nothing. */
  async setQuantity(
    userId: string,
    storeId: string,
    productId: string,
    quantity: number,
  ) {
    await this.change(userId, storeId, productId, () => quantity, false);
    return this.view(userId, storeId);
  }

  private async change(
    userId: string,
    storeId: string,
    productId: string,
    next: (current: number) => number,
    createIfMissing: boolean,
  ) {
    const cart = await this.cartOf(userId, storeId);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Cart" WHERE id = ${cart.id} FOR UPDATE`;
      // A product of another store is answered like one that does not exist: a cart holds one store only.
      const product = await tx.product.findFirst({
        where: { id: productId, storeId },
      });
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

  async remove(userId: string, storeId: string, productId: string) {
    const cart = await this.cartOf(userId, storeId);
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id, productId },
    });
  }

  async clear(userId: string, storeId: string) {
    const cart = await this.cartOf(userId, storeId);
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
        imageId: product.imageIds?.[0] ?? null,
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
