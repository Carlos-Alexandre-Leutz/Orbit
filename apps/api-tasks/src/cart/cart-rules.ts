/** The most units of one product a cart may hold, and the most different products. */
export const MAX_UNITS_PER_PRODUCT = 10;
export const MAX_DISTINCT_PRODUCTS = 20;

export type CartRuleCode =
  | 'UNAVAILABLE'
  | 'OUT_OF_STOCK'
  | 'NOT_ENOUGH_STOCK'
  | 'TOO_MANY_UNITS'
  | 'TOO_MANY_PRODUCTS';

export interface CartRuleBreak {
  code: CartRuleCode;
  message: string;
}

export interface CartChange {
  /** Units the cart will hold of this product after the change. */
  resulting: number;
  stock: number;
  active: boolean;
  /** Different products in the cart before the change, and whether this one is already one of them. */
  lines: number;
  alreadyInCart: boolean;
}

/** Why a change to the cart is refused, or null when it is allowed. The order of the checks is the order of the messages. */
export function brokenRule(change: CartChange): CartRuleBreak | null {
  if (!change.active) {
    return {
      code: 'UNAVAILABLE',
      message: 'Este produto não está mais à venda',
    };
  }
  if (change.stock <= 0) {
    return { code: 'OUT_OF_STOCK', message: 'Produto sem estoque' };
  }
  if (change.resulting > MAX_UNITS_PER_PRODUCT) {
    return {
      code: 'TOO_MANY_UNITS',
      message: `O limite é de ${MAX_UNITS_PER_PRODUCT} unidades por produto`,
    };
  }
  if (change.resulting > change.stock) {
    return {
      code: 'NOT_ENOUGH_STOCK',
      message: `Só há ${change.stock} unidade(s) em estoque`,
    };
  }
  if (!change.alreadyInCart && change.lines >= MAX_DISTINCT_PRODUCTS) {
    return {
      code: 'TOO_MANY_PRODUCTS',
      message: `O carrinho aceita no máximo ${MAX_DISTINCT_PRODUCTS} produtos diferentes`,
    };
  }
  return null;
}
