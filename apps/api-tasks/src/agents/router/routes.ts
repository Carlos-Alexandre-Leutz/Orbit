import { Role } from '@prisma/client';

export interface RouteInfo {
  name: string;
  /** Shown to the classifier so it can choose. */
  description: string;
  /** Roles whose messages may be sent to this route. */
  roles: Role[];
}

const SHOPPERS: Role[] = [Role.CUSTOMER, Role.SELLER];
const EVERYONE: Role[] = [Role.CUSTOMER, Role.SELLER, Role.ADMIN];

/** Where a message can go. The agents behind each route come in the next PBIs. */
export const ROUTES: RouteInfo[] = [
  {
    name: 'catalog',
    description: 'Finding or asking about products on sale.',
    roles: SHOPPERS,
  },
  {
    name: 'cart',
    description: 'Looking at or changing the shopping cart.',
    roles: SHOPPERS,
  },
  {
    name: 'orders',
    description: 'Buying, tracking or cancelling an order.',
    roles: SHOPPERS,
  },
  {
    name: 'seller_tools',
    description: 'The seller running their own store: sales, stock, products.',
    roles: [Role.SELLER],
  },
  {
    name: 'general',
    description: 'Greetings and general questions about how the store works.',
    roles: EVERYONE,
  },
  {
    name: 'human',
    description:
      'The person asks for a human, or the matter is a complaint or a dispute.',
    roles: EVERYONE,
  },
];

export const routesFor = (role: Role) =>
  ROUTES.filter((r) => r.roles.includes(role));
export const routeNamed = (name: string) => ROUTES.find((r) => r.name === name);
