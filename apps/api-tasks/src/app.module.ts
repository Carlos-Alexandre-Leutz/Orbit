import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { CatalogModule } from './catalog/catalog.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { StoresModule } from './stores/stores.module';
import { CustomersModule } from './customers/customers.module';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    CatalogModule,
    CartModule,
    OrdersModule,
    PrismaModule,
    StoresModule,
    CustomersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
