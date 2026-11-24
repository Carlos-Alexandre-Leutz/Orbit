import { Global, Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module';
import { CartService } from '../cart/cart.service';
import { CatalogModule } from '../catalog/catalog.module';
import { ProductsService } from '../catalog/products.service';
import { OrdersModule } from '../orders/orders.module';
import { OrdersService } from '../orders/orders.service';
import { createCustomerTools } from './customer-tools';
import { PrismaService } from '../prisma/prisma.service';
import { GovernancePolicy } from '../policy/governance-policy';
import { loadPolicy } from '../policy/policy-loader';
import { ToolExecutor } from './tool-executor';
import { ToolRegistry } from './tool-registry';

/** The tool layer. Nothing calls it yet: the agent loop (PBI-20) will. The approval gate comes from the ApprovalsModule (PBI-13). */
@Global()
@Module({
  imports: [CatalogModule, CartModule, OrdersModule],
  providers: [
    {
      provide: ToolRegistry,
      inject: [ProductsService, CartService, OrdersService],
      useFactory: (
        products: ProductsService,
        cart: CartService,
        orders: OrdersService,
      ) => new ToolRegistry(createCustomerTools({ products, cart, orders })),
    },
    {
      // Checked against the real tools: a policy with a typo stops the API from starting.
      provide: GovernancePolicy,
      inject: [ToolRegistry, PrismaService],
      useFactory: (registry: ToolRegistry, prisma: PrismaService) =>
        loadPolicy(
          (name) => registry.get(name),
          (actorId, tool, since) =>
            prisma.auditEntry.count({
              where: {
                actorId,
                tool,
                occurredAt: { gte: since },
                outcome: { in: ['SUCCESS', 'FAILURE'] },
              },
            }),
        ),
    },
    ToolExecutor,
  ],
  exports: [ToolExecutor, ToolRegistry, GovernancePolicy],
})
export class ToolsModule {}
