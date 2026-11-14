import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { CatalogModule } from './catalog/catalog.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [AuthModule, UsersModule, CatalogModule, CartModule, OrdersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
