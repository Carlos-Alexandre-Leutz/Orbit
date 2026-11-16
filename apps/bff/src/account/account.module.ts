import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import {
  AccountController,
  StoreCustomersController,
} from './account.controller';

@Module({
  imports: [HttpModule],
  controllers: [AccountController, StoreCustomersController],
})
export class AccountModule {}
