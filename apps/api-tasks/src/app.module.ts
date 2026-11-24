import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { adminPath } from './admin/admin-path';
import { BillingModule } from './billing/billing.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { CatalogModule } from './catalog/catalog.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { StoresModule } from './stores/stores.module';
import { ImagesModule } from './images/images.module';
import { CustomersModule } from './customers/customers.module';
import { AuditModule } from './audit/audit.module';
import { CorrelationModule } from './correlation/correlation.module';

@Module({
  imports: [
    ...(adminPath() ? [AdminModule] : []),
    BillingModule,
    UsersModule,
    AuthModule,
    CatalogModule,
    CartModule,
    OrdersModule,
    PrismaModule,
    StoresModule,
    ImagesModule,
    CustomersModule,
    AuditModule,
    CorrelationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
