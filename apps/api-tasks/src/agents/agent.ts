import { Role } from '@prisma/client';

/** What an agent is: a name, a persona, and the tools it may use. */
export interface AgentDefinition {
  /** Recorded on every audited step it takes. */
  name: string;
  promptVersion: string;
  /** The persona and rules; the tool list and the answer format are added by the loop. */
  instructions: string;
  /** The tools this agent may call, by name; the role and the policy still apply on top. */
  tools: string[];
}

export interface AgentLimits {
  maxSteps: number;
  /** Millionths of a US dollar for the whole run. */
  maxCostMicroUsd: number;
}

/** What the chat shows while an agent works. Tool inputs are left out: they may hold an address. */
export type AgentEvent =
  | { type: 'conversation'; id: string }
  | { type: 'status'; text: string }
  | { type: 'tool_call'; tool: string }
  | { type: 'tool_result'; tool: string; ok: boolean; code?: string }
  | { type: 'approval_required'; approvalId?: string; tool: string }
  | { type: 'message'; text: string }
  | { type: 'done'; status: AgentStatus; steps: number; costMicroUsd: number };

export type AgentStatus =
  | 'answered'
  | 'awaiting_approval'
  | 'limit_reached'
  | 'failed'
  | 'escalated'
  | 'refused'
  | 'clarify';

export interface AgentResult {
  status: AgentStatus;
  message: string;
  steps: number;
  costMicroUsd: number;
  approvalId?: string;
}

export type Emit = (event: AgentEvent) => void;

export interface Actor {
  id: string;
  role: Role;
}
