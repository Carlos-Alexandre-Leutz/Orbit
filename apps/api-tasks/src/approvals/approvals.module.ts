import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ApprovalGate } from '../tools/tool';
import { ApprovalsController } from './approvals.controller';
import {
  APPROVALS_CONFIG,
  ApprovalsConfig,
  ApprovalsService,
  DatabaseApprovalGate,
} from './approvals.service';

/** Provides the real approval gate to the tool layer. */
@Global()
@Module({
  controllers: [ApprovalsController],
  providers: [
    {
      provide: APPROVALS_CONFIG,
      useFactory: (): ApprovalsConfig => ({
        highValueCents: Number(process.env.APPROVAL_HIGH_VALUE_CENTS) || 50_000,
        ttlHours: Number(process.env.APPROVAL_TTL_HOURS) || 24,
      }),
    },
    {
      provide: ApprovalsService,
      inject: [PrismaService, AuditService, APPROVALS_CONFIG],
      useFactory: (
        prisma: PrismaService,
        audit: AuditService,
        config: ApprovalsConfig,
      ) => new ApprovalsService(prisma, audit, config),
    },
    {
      provide: ApprovalGate,
      inject: [ApprovalsService],
      useFactory: (approvals: ApprovalsService) =>
        new DatabaseApprovalGate(approvals),
    },
  ],
  exports: [ApprovalGate, ApprovalsService],
})
export class ApprovalsModule {}
