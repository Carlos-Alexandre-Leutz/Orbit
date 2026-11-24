import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ApprovalsController } from './approvals.controller';

@Module({
  imports: [HttpModule],
  controllers: [ApprovalsController],
})
export class ApprovalsModule {}
