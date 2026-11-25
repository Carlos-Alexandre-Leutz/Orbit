import { Module } from '@nestjs/common';
import { StoresModule } from '../stores/stores.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [StoresModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
