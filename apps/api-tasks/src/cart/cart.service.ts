import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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

  async add(userId: string, productId: string, quantity: number) {
    await this.requireProduct(productId);
    const cart = await this.cartOf(userId);
    await this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      create: { cartId: cart.id, productId, quantity },
      update: { quantity: { increment: quantity } },
    });
    return this.view(userId);
  }

  /** Sets the quantity of a line that is already in the cart. Repeating it changes nothing. */
  async setQuantity(userId: string, productId: string, quantity: number) {
    const cart = await this.cartOf(userId);
    const { count } = await this.prisma.cartItem.updateMany({
      where: { cartId: cart.id, productId },
      data: { quantity },
    });
    if (count === 0) {
      throw new NotFoundException('Este produto não está no carrinho');
    }
    return this.view(userId);
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

  private async requireProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    return product;
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
