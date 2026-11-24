import { Role } from '@prisma/client';

/** Who runs a tool and with which key. The agent loop builds it from the signed-in user, never from the model. */
export interface ToolContext {
  actor: { id: string; role: Role };
  /** Required by a tool that changes data: the same key never runs the tool twice. */
  idempotencyKey?: string;
}

/**
 * The contract of everything an agent can do. A tool is a validated function, not free text: it says who
 * may call it, whether it changes data, and whether a human must approve it first.
 */
export interface Tool<I = unknown, O = unknown> {
  /** `area.action`, such as `cart.add_item`. */
  name: string;
  /** Shown to the model so it knows when to use the tool. */
  description: string;
  /** The JSON Schema of the input, for the model. `parse` is what actually enforces it. */
  inputSchema: Record<string, unknown>;
  /** Roles allowed to call the tool. */
  roles: Role[];
  /** True when the tool changes data; such a tool needs an idempotency key. */
  sideEffect: boolean;
  /** True when a human must approve the call before it runs. Only for tools with a side effect. */
  requiresApproval: boolean;
  /** Validates the raw input and returns it typed; throws `ToolInputError` with a readable message. */
  parse(input: unknown): I;
  run(input: I, context: ToolContext): Promise<O>;
  /** What goes to the audit log in place of the input (leave out names, addresses, free text). */
  auditInput?(input: I): Record<string, unknown>;
  /** What goes to the audit log in place of the output. */
  auditOutput?(output: O): Record<string, unknown>;
  /** What a person reads before approving: a sentence and the money at stake, if any. */
  approvalSummary?(
    input: I,
    context: ToolContext,
  ): Promise<{ description: string; amountCents?: number }>;
}

export class ToolInputError extends Error {}

export type ToolErrorCode =
  | 'UNKNOWN_TOOL'
  | 'FORBIDDEN'
  | 'INVALID_INPUT'
  | 'IDEMPOTENCY_KEY_REQUIRED'
  | 'APPROVAL_REQUIRED'
  | 'APPROVAL_REJECTED'
  | 'IN_PROGRESS'
  | 'TOOL_FAILED';

export type ToolResult =
  | { ok: true; output: unknown; replayed: boolean }
  | {
      ok: false;
      error: { code: ToolErrorCode; message: string; approvalId?: string };
    };

export type ApprovalDecision =
  | { status: 'approved'; approverId: string; approvalId?: string }
  | { status: 'pending'; approvalId?: string }
  | { status: 'rejected'; reason?: string };

/**
 * The port to the human approval (PBI-13 builds the real one). The default holds every call that needs
 * approval, so a tool with a side effect never runs unapproved.
 */
export abstract class ApprovalGate {
  abstract check(request: {
    actor: ToolContext['actor'];
    tool: string;
    input: unknown;
    idempotencyKey: string;
    summary: { description: string; amountCents?: number };
  }): Promise<ApprovalDecision>;

  /** Called after an approved call ran with success, so the approval is not used twice. */
  complete(approvalId: string): Promise<void> {
    void approvalId;
    return Promise.resolve();
  }
}

export class HoldingApprovalGate extends ApprovalGate {
  check(): Promise<ApprovalDecision> {
    return Promise.resolve({ status: 'pending' });
  }
}
