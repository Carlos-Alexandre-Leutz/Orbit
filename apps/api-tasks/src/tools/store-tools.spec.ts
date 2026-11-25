import 'reflect-metadata';
import { Role } from '@prisma/client';
import { createStoreTools } from './store-tools';
import { Tool, ToolInputError } from './tool';

const store = {
  name: 'Loja do João',
  tagline: 'Good things',
  description: 'A shop',
  contactEmail: 'joao@example.com',
  contactPhone: '',
  shippingFlatCents: 1000,
  freeShippingOverCents: 10000,
  pickupEnabled: true,
  handlingDays: 1,
  deliveryDaysMin: 3,
  deliveryDaysMax: 7,
  deliveryByState: { SC: { min: 1, max: 2 } },
  highlights: [{ id: 'a', text: 'Free gift wrap' }, { id: 'b' }],
};

function tools() {
  const deps = {
    products: {
      list: jest.fn().mockResolvedValue({
        total: 1,
        items: [
          {
            name: 'Mug',
            priceCents: 1250,
            stock: 3,
            description: 'x'.repeat(500),
            category: { name: 'Kitchen' },
          },
        ],
      }),
    },
    stores: {
      bySlug: jest.fn().mockResolvedValue(store),
      categoriesOf: jest
        .fn()
        .mockResolvedValue([{ slug: 'k', name: 'Kitchen' }]),
    },
  };
  const byName = Object.fromEntries(
    createStoreTools(deps as never).map((t) => [t.name, t]),
  ) as Record<string, Tool>;
  return { deps, byName };
}

const context = {
  actor: { id: 'visitor:1', role: Role.CUSTOMER },
  store: { id: 's1', slug: 'loja' },
};

describe('store tools', () => {
  it('only read, for the customer role, and need no approval', () => {
    const { byName } = tools();
    expect(Object.keys(byName).sort()).toEqual([
      'store.delivery_estimate',
      'store.info',
      'store.search_products',
    ]);
    for (const tool of Object.values(byName)) {
      expect(tool.sideEffect).toBe(false);
      expect(tool.requiresApproval).toBe(false);
      expect(tool.roles).toEqual([Role.CUSTOMER]);
    }
  });

  it('search is always about the store of the context, never one the model names', async () => {
    const { deps, byName } = tools();
    const tool = byName['store.search_products'];
    // The input has no store field at all: a model that names one is refused before the tool runs.
    expect(() => tool.parse({ query: 'mug', store: 'other-store' })).toThrow(
      ToolInputError,
    );
    const out = (await tool.run(tool.parse({ query: 'mug' }), context)) as {
      products: { price: string; description: string }[];
    };
    expect(deps.products.list).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'mug', store: 'loja' }),
    );
    expect(out.products[0]).toMatchObject({ price: '$12.50' });
    expect(out.products[0]?.description).toHaveLength(300);
  });

  it('info lists the highlight texts and the shipping rules', async () => {
    const { byName } = tools();
    const out = (await byName['store.info'].run({}, context)) as {
      highlights: string[];
      shipping: { freeOver: string };
      categories: string[];
    };
    expect(out.highlights).toEqual(['Free gift wrap']);
    expect(out.shipping.freeOver).toBe('$100.00');
    expect(out.categories).toEqual(['Kitchen']);
  });

  it('delivery adds the preparation to the trip, and uses the state when the seller priced it', async () => {
    const { byName } = tools();
    const tool = byName['store.delivery_estimate'];
    const general = (await tool.run(tool.parse({}), context)) as {
      shippingBusinessDays: { min: number; max: number };
    };
    expect(general.shippingBusinessDays).toEqual({ min: 4, max: 8 });
    const sc = (await tool.run(tool.parse({ state: 'sc' }), context)) as {
      shippingBusinessDays: { min: number; max: number };
    };
    expect(sc.shippingBusinessDays).toEqual({ min: 2, max: 3 });
  });

  it('refuses a call that is not tied to a store', async () => {
    const { byName } = tools();
    await expect(
      byName['store.info'].run({}, { actor: context.actor }),
    ).rejects.toBeInstanceOf(ToolInputError);
  });
});
