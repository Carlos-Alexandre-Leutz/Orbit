import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Approval, Prisma, Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { currentCorrelationId } from '../correlation/correlation';
import { PrismaService } from '../prisma/prisma.service';
import { ApprovalDecision, ApprovalGate, ToolContext } from '../tools/tool';

export interface ApprovalsConfig {
  /** Above this amount (in cents) the approver must type the amount back. */
  highValueCents: number;
  ttlHours: number;
}
export const APPROVALS_CONFIG = 'APPROVALS_CONFIG';

export interface Decider {
  id: string;
  role: Role;
}

function present(approval: Approval) {
  return {
    id: approval.id,
    tool: approval.tool,
    summary: approval.summary,
    amountCents: approval.amountCents,
    needsAmountConfirmation: approval.needsAmountConfirmation,
    status: approval.status,
    createdAt: approval.createdAt,
    expiresAt: approval.expiresAt,
    decidedAt: approval.decidedAt,
    reason: approval.reason,
  };
}

/**
 * The human approval of a tool call: the agent proposes (the executor asks the gate), a person approves or
 * rejects, and the call then runs. Only the person the call acts for, or an admin, may decide. Above the
 * high-value limit the approver must type the amount back, so a click alone cannot approve a big spend.
 * Every decision is written to the audit log with who decided.
 */
@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ApprovalsConfig,
  ) {}

  /** Finds or creates the approval of this call, and says where it stands. */
  async request(request: {
    actor: ToolContext['actor'];
    tool: string;
    input: unknown;
    idempotencyKey: string;
    summary: { description: string; amountCents?: number };
    highValueCents?: number;
  }): Promise<ApprovalDecision> {
    const where = {
      actorId_tool_idempotencyKey: {
        actorId: request.actor.id,
        tool: request.tool,
        idempotencyKey: request.idempotencyKey,
      },
    };
    let approval = await this.prisma.approval.findUnique({ where });
    if (!approval) {
      const amount = request.summary.amountCents;
      try {
        approval = await this.prisma.approval.create({
          data: {
            actorId: request.actor.id,
            actorRole: request.actor.role,
            tool: request.tool,
            idempotencyKey: request.idempotencyKey,
            input: request.input as Prisma.InputJsonValue,
            summary: request.summary.description.slice(0, 300),
            amountCents: amount ?? null,
            needsAmountConfirmation:
              amount !== undefined &&
              amount > (request.highValueCents ?? this.config.highValueCents),
            expiresAt: new Date(Date.now() + this.config.ttlHours * 3_600_000),
            correlationId: currentCorrelationId() ?? null,
          },
        });
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== 'P2002'
        ) {
          throw error;
        }
        approval = await this.prisma.approval.findUniqueOrThrow({ where });
      }
    }
    return this.decisionOf(approval);
  }

  private async decisionOf(approval: Approval): Promise<ApprovalDecision> {
    if (approval.status === 'PENDING' && approval.expiresAt <= new Date()) {
      await this.prisma.approval.updateMany({
        where: { id: approval.id, status: 'PENDING' },
        data: { status: 'EXPIRED' },
      });
      return { status: 'rejected', reason: 'The approval expired' };
    }
    switch (approval.status) {
      case 'PENDING':
        return { status: 'pending', approvalId: approval.id };
      case 'APPROVED':
        return {
          status: 'approved',
          approverId: approval.approverId ?? '',
          approvalId: approval.id,
        };
      case 'EXECUTED':
        // Already used: a repeat of the same key is answered from the stored run, not approved again.
        return {
          status: 'approved',
          approverId: approval.approverId ?? '',
          approvalId: approval.id,
        };
      case 'REJECTED':
        return { status: 'rejected', reason: approval.reason ?? undefined };
      default:
        return { status: 'rejected', reason: 'The approval expired' };
    }
  }

  async markExecuted(approvalId: string) {
    await this.prisma.approval.updateMany({
      where: { id: approvalId, status: 'APPROVED' },
      data: { status: 'EXECUTED' },
    });
  }

  /** The approvals of a user waiting for a decision. */
  async pendingOf(userId: string) {
    const rows = await this.prisma.approval.findMany({
      where: {
        actorId: userId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map(present);
  }

  async get(id: string, who: Decider) {
    return present(await this.owned(id, who));
  }

  /** Approves a pending call. Returns what the executor needs to run it. */
  async approve(id: string, who: Decider, confirmAmountCents?: number) {
    const approval = await this.owned(id, who);
    this.mustBeOpen(approval);
    if (
      approval.needsAmountConfirmation &&
      confirmAmountCents !== approval.amountCents
    ) {
      throw new ConflictException({
        statusCode: 409,
        code: 'AMOUNT_CONFIRMATION_REQUIRED',
        message: `This is above the limit: send confirmAmountCents with the exact amount (${approval.amountCents})`,
      });
    }
    const done = await this.prisma.approval.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'APPROVED', approverId: who.id, decidedAt: new Date() },
    });
    if (done.count !== 1) throw new ConflictException('Already decided');
    await this.write('approvals.approve', approval, who, 'SUCCESS');
    return approval;
  }

  async reject(id: string, who: Decider, reason?: string) {
    const approval = await this.owned(id, who);
    this.mustBeOpen(approval);
    const done = await this.prisma.approval.updateMany({
      where: { id, status: 'PENDING' },
      data: {
        status: 'REJECTED',
        approverId: who.id,
        decidedAt: new Date(),
        reason: reason?.slice(0, 200) ?? null,
      },
    });
    if (done.count !== 1) throw new ConflictException('Already decided');
    await this.write('approvals.reject', approval, who, 'SUCCESS');
    return present({ ...approval, status: 'REJECTED', reason: reason ?? null });
  }

  /** To anyone but the person it acts for and an admin, an approval does not exist. */
  private async owned(id: string, who: Decider) {
    const approval = await this.prisma.approval.findUnique({ where: { id } });
    if (!approval || (approval.actorId !== who.id && who.role !== 'ADMIN')) {
      throw new NotFoundException('Approval not found');
    }
    return approval;
  }

  private mustBeOpen(approval: Approval) {
    if (approval.status !== 'PENDING') {
      throw new ConflictException(
        `This approval is already ${approval.status}`,
      );
    }
    if (approval.expiresAt <= new Date()) {
      throw new ConflictException('This approval expired');
    }
  }

  private async write(
    tool: string,
    approval: Approval,
    who: Decider,
    outcome: 'SUCCESS' | 'FAILURE',
  ) {
    await this.audit.record({
      actorId: who.id,
      actorRole: who.role,
      tool,
      parameters: { approvalId: approval.id, tool: approval.tool },
      result: { requestedBy: approval.actorId },
      outcome,
      approverId: who.id,
    });
  }
}

/** The real gate: asks the approvals service instead of holding every call. */
export class DatabaseApprovalGate extends ApprovalGate {
  constructor(private readonly approvals: ApprovalsService) {
    super();
  }

  check(request: Parameters<ApprovalGate['check']>[0]) {
    return this.approvals.request(request);
  }

  override complete(approvalId: string) {
    return this.approvals.markExecuted(approvalId);
  }
}
