import { Role } from '@prisma/client';

/** What one role may do with one tool, beyond being allowed to call it. */
export interface ToolRule {
  /** Forces approval even when the tool itself does not ask for it (it can never lower the tool's own). */
  requiresApproval?: boolean;
  /** A hard cap: a call that moves more money than this (in cents) is refused. */
  maxAmountCents?: number;
  /** Above this amount (in cents) the approver must type the amount back. Overrides the global limit. */
  highValueCents?: number;
  /** At most this many executed calls by one actor in the last hour. */
  maxCallsPerHour?: number;
  /** At most this many executed calls by one actor in the last 24 hours. */
  maxCallsPerDay?: number;
}

export const RULE_KEYS = [
  'requiresApproval',
  'maxAmountCents',
  'highValueCents',
  'maxCallsPerHour',
  'maxCallsPerDay',
] as const;

/** The policy file: who (role) may use which tool, with which limits. Versioned in `versions/`. */
export interface PolicyDocument {
  version: number;
  description?: string;
  roles: Partial<Record<Role, { tools: Record<string, ToolRule> }>>;
}

export type PolicyVerdict =
  | { allowed: true; requiresApproval: boolean; highValueCents?: number }
  | { allowed: false; code: 'FORBIDDEN' | 'LIMIT_EXCEEDED'; message: string };

/** How many executed calls an actor made of a tool since a moment; the audit log answers it. */
export type CallCounter = (
  actorId: string,
  tool: string,
  since: Date,
) => Promise<number>;

const HOUR = 3_600_000;

/**
 * The rules of governance, applied before a tool runs. A tool a role is not listed for is refused (deny by
 * default), and the limits are checked against what the call would do. The policy can only be stricter than
 * the tool's own definition: it never lets a role call a tool the tool itself does not allow.
 */
export class GovernancePolicy {
  constructor(
    private readonly document: PolicyDocument,
    private readonly countCalls: CallCounter,
    private readonly now: () => number = Date.now,
  ) {}

  get version() {
    return this.document.version;
  }

  ruleFor(role: Role, tool: string): ToolRule | undefined {
    return this.document.roles[role]?.tools[tool];
  }

  allows(role: Role, tool: string): boolean {
    return this.ruleFor(role, tool) !== undefined;
  }

  /** The tools a role may use, by name. */
  toolsOf(role: Role): string[] {
    return Object.keys(this.document.roles[role]?.tools ?? {});
  }

  /** The limits for a call; `amountCents` is what the call would move, when the tool can tell. */
  async check(request: {
    actor: { id: string; role: Role };
    tool: string;
    amountCents?: number;
  }): Promise<PolicyVerdict> {
    const rule = this.ruleFor(request.actor.role, request.tool);
    if (!rule) {
      return {
        allowed: false,
        code: 'FORBIDDEN',
        message: `The policy does not allow ${request.actor.role} to use ${request.tool}`,
      };
    }
    if (
      rule.maxAmountCents !== undefined &&
      request.amountCents !== undefined &&
      request.amountCents > rule.maxAmountCents
    ) {
      return {
        allowed: false,
        code: 'LIMIT_EXCEEDED',
        message: `${request.tool} is limited to ${rule.maxAmountCents} cents per call`,
      };
    }
    for (const [limit, windowMs, label] of [
      [rule.maxCallsPerHour, HOUR, 'hour'],
      [rule.maxCallsPerDay, 24 * HOUR, 'day'],
    ] as const) {
      if (limit === undefined) continue;
      const made = await this.countCalls(
        request.actor.id,
        request.tool,
        new Date(this.now() - windowMs),
      );
      if (made >= limit) {
        return {
          allowed: false,
          code: 'LIMIT_EXCEEDED',
          message: `${request.tool} is limited to ${limit} calls per ${label}`,
        };
      }
    }
    return {
      allowed: true,
      requiresApproval: rule.requiresApproval === true,
      highValueCents: rule.highValueCents,
    };
  }
}
