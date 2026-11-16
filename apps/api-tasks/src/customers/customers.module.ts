import { Module } from '@nestjs/common';
import { StoresModule } from '../stores/stores.module';
import {
  AccountController,
  StoreCustomersController,
} from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [StoresModule],
  controllers: [AccountController, StoreCustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
