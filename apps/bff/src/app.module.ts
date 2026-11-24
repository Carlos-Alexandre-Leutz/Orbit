import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { adminPath } from './admin/admin-path';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { ChatModule } from './chat/chat.module';
import { ConversationsModule } from './conversations/conversations.module';
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
    ...(adminPath() ? [AdminModule] : []),
    AuthModule,
    BillingModule,
    UsersModule,
    CatalogModule,
    StoresModule,
    AccountModule,
    ImagesModule,
    CartModule,
    ApprovalsModule,
    ChatModule,
    ConversationsModule,
    OrdersModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
