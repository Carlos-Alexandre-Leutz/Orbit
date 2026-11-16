import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { PaymentsModule } from './payments/payments.module';
import { OrdersModule } from './orders/orders.module';
import { CatalogModule } from './catalog/catalog.module';
import { StoresModule } from './stores/stores.module';
import { AccountModule } from './account/account.module';
import { ImagesModule } from './images/images.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    CatalogModule,
    StoresModule,
    AccountModule,
    ImagesModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
