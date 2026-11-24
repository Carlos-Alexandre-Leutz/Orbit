import { HttpException, Injectable, Logger } from '@nestjs/common';
import { AuditOutcome, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { recordStep } from '../correlation/correlation';
import { GovernancePolicy } from '../policy/governance-policy';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApprovalGate,
  Tool,
  ToolContext,
  ToolErrorCode,
  ToolInputError,
  ToolResult,
} from './tool';
import { ToolRegistry } from './tool-registry';

const DENIED_CODES = new Set<ToolErrorCode>([
  'UNKNOWN_TOOL',
  'FORBIDDEN',
  'LIMIT_EXCEEDED',
  'APPROVAL_REJECTED',
]);

const fail = (
  code: ToolErrorCode,
  message: string,
  approvalId?: string,
): ToolResult => ({
  ok: false,
  error: { code, message, ...(approvalId ? { approvalId } : {}) },
});

/**
 * Runs a tool for an actor, in this order: the tool exists, the role may call it, the input is valid, a
 * tool with a side effect has an idempotency key and (when it needs one) an approval, and a repeated key
 * gets the stored answer instead of a second run. Every outcome, including the refusals, is written to the
 * audit log. It never throws for an expected failure: the agent gets a result it can read.
 */
@Injectable()
export class ToolExecutor {
  private readonly logger = new Logger(ToolExecutor.name);

  constructor(
    private readonly registry: ToolRegistry,
    private readonly approvals: ApprovalGate,
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
    private readonly policy: GovernancePolicy,
  ) {}

  async execute(
    name: string,
    rawInput: unknown,
    context: ToolContext,
  ): Promise<ToolResult> {
    const tool = this.registry.get(name);
    if (!tool) {
      return this.refuse(
        name,
        undefined,
        context,
        'UNKNOWN_TOOL',
        `There is no tool named ${name}`,
      );
    }
    if (!tool.roles.includes(context.actor.role)) {
      return this.refuse(
        name,
        tool,
        context,
        'FORBIDDEN',
        `The role ${context.actor.role} cannot use ${name}`,
      );
    }
    if (!this.policy.allows(context.actor.role, name)) {
      return this.refuse(
        name,
        tool,
        context,
        'FORBIDDEN',
        `The policy does not allow ${context.actor.role} to use ${name}`,
      );
    }
    let input: unknown;
    try {
      input = tool.parse(rawInput);
    } catch (error) {
      if (!(error instanceof ToolInputError)) throw error;
      return this.refuse(name, tool, context, 'INVALID_INPUT', error.message);
    }
    if (!tool.sideEffect) {
      const verdict = await this.policy.check({
        actor: context.actor,
        tool: name,
      });
      if (!verdict.allowed) {
        return this.refuse(
          name,
          tool,
          context,
          verdict.code,
          verdict.message,
          input,
        );
      }
      return this.run(tool, input, context);
    }

    const key = context.idempotencyKey;
    if (!key) {
      return this.refuse(
        name,
        tool,
        context,
        'IDEMPOTENCY_KEY_REQUIRED',
        `${name} changes data and needs an idempotency key`,
        input,
      );
    }
    const described = await tool.approvalSummary?.(input, context);
    const verdict = await this.policy.check({
      actor: context.actor,
      tool: name,
      amountCents: described?.amountCents,
    });
    if (!verdict.allowed) {
      return this.refuse(
        name,
        tool,
        context,
        verdict.code,
        verdict.message,
        input,
      );
    }
    let approverId: string | undefined;
    let approvalId: string | undefined;
    if (tool.requiresApproval || verdict.requiresApproval) {
      const summary = described ?? { description: `Run ${name}` };
      const decision = await this.approvals.check({
        actor: context.actor,
        tool: name,
        input,
        idempotencyKey: key,
        summary,
        highValueCents: verdict.highValueCents,
      });
      if (decision.status === 'pending') {
        await this.write(tool, context, input, 'PENDING_APPROVAL', {
          approvalId: decision.approvalId ?? null,
        });
        return fail(
          'APPROVAL_REQUIRED',
          `${name} waits for a human to approve it`,
          decision.approvalId,
        );
      }
      if (decision.status === 'rejected') {
        return this.refuse(
          name,
          tool,
          context,
          'APPROVAL_REJECTED',
          decision.reason ?? 'A human rejected this call',
          input,
        );
      }
      approverId = decision.approverId;
      approvalId = decision.approvalId;
    }

    const claimed = await this.claim(context.actor.id, name, key);
    if (claimed.kind === 'replay') {
      recordStep('tool.replayed', { tool: name });
      return { ok: true, output: claimed.result, replayed: true };
    }
    if (claimed.kind === 'busy') {
      return fail('IN_PROGRESS', `${name} is already running with this key`);
    }
    const result = await this.run(tool, input, context, approverId);
    await this.finish(claimed.id, result);
    if (approvalId && result.ok) await this.approvals.complete(approvalId);
    return result;
  }

  private async run(
    tool: Tool,
    input: unknown,
    context: ToolContext,
    approverId?: string,
  ): Promise<ToolResult> {
    try {
      const output = await tool.run(input, context);
      await this.write(
        tool,
        context,
        input,
        'SUCCESS',
        tool.auditOutput?.(output) ?? {},
        approverId,
      );
      return { ok: true, output, replayed: false };
    } catch (error) {
      // A refusal the store made on purpose (empty cart, out of stock) keeps its message for the agent;
      // anything else is an internal error and must not leak details.
      const message =
        error instanceof HttpException && error.getStatus() < 500
          ? this.messageOf(error)
          : 'The tool failed';
      if (!(error instanceof HttpException) || error.getStatus() >= 500) {
        this.logger.error(`${tool.name} failed: ${(error as Error).message}`);
      }
      await this.write(
        tool,
        context,
        input,
        'FAILURE',
        { error: message },
        approverId,
      );
      return fail('TOOL_FAILED', message);
    }
  }

  private messageOf(error: HttpException): string {
    const body = error.getResponse();
    if (typeof body === 'string') return body;
    const message = (body as { message?: string | string[] }).message;
    return Array.isArray(message)
      ? message.join('; ')
      : (message ?? error.message);
  }

  /** Takes the (actor, tool, key) slot, or says what is already there. */
  private async claim(actorId: string, tool: string, key: string) {
    try {
      const run = await this.prisma.toolRun.create({
        data: { actorId, tool, idempotencyKey: key },
      });
      return { kind: 'claimed' as const, id: run.id };
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }
    }
    const where = {
      actorId_tool_idempotencyKey: { actorId, tool, idempotencyKey: key },
    };
    const existing = await this.prisma.toolRun.findUniqueOrThrow({ where });
    if (existing.status === 'COMPLETED') {
      return { kind: 'replay' as const, result: existing.result };
    }
    if (existing.status === 'FAILED') {
      // Take it back only if nobody else did first.
      const taken = await this.prisma.toolRun.updateMany({
        where: { id: existing.id, status: 'FAILED' },
        data: { status: 'STARTED', error: null },
      });
      if (taken.count === 1)
        return { kind: 'claimed' as const, id: existing.id };
    }
    return { kind: 'busy' as const };
  }

  private async finish(id: string, result: ToolResult) {
    await this.prisma.toolRun.update({
      where: { id },
      data: result.ok
        ? {
            status: 'COMPLETED',
            result: result.output as Prisma.InputJsonValue,
          }
        : { status: 'FAILED', error: result.error.message },
    });
  }

  private async refuse(
    name: string,
    tool: Tool | undefined,
    context: ToolContext,
    code: ToolErrorCode,
    message: string,
    input?: unknown,
  ): Promise<ToolResult> {
    await this.write(
      tool ?? name,
      context,
      input,
      DENIED_CODES.has(code) ? 'DENIED' : 'FAILURE',
      { error: code, message },
    );
    return fail(code, message);
  }

  private async write(
    tool: Tool | string,
    context: ToolContext,
    input: unknown,
    outcome: AuditOutcome,
    result: Record<string, unknown>,
    approverId?: string,
  ) {
    const name = typeof tool === 'string' ? tool : tool.name;
    // Only a tool that vouches for its own audit view logs its input; a refused or unknown call logs none.
    const parameters =
      typeof tool !== 'string' && input !== undefined
        ? (tool.auditInput?.(input) ?? {})
        : {};
    try {
      await this.audit.record({
        actorId: context.actor.id,
        actorRole: context.actor.role,
        tool: name,
        parameters: parameters as Prisma.InputJsonValue,
        result: {
          ...result,
          policyVersion: this.policy.version,
        } as Prisma.InputJsonValue,
        outcome,
        approverId,
        agent: context.agent,
        model: context.model,
        promptVersion: context.promptVersion,
      });
    } catch (error) {
      this.logger.error(`Could not audit ${name}: ${(error as Error).message}`);
    }
  }
}
