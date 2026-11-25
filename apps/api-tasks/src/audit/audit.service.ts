import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditOutcome, Prisma, Role } from '@prisma/client';
import { currentCorrelationId } from '../correlation/correlation';
import { PrismaService } from '../prisma/prisma.service';

/** What one audited step records. Only `tool` and `outcome` are required. */
export interface AuditRecord {
  /** The signed-in user who acted; leave out for the system, a webhook or a visitor. */
  actorId?: string | null;
  actorRole?: Role | null;
  /** The tool or action name, such as `cart.add_item`. */
  tool: string;
  /** What the tool was called with. Never put a password, a card or a payment key here. */
  parameters?: Prisma.InputJsonValue;
  result?: Prisma.InputJsonValue;
  outcome: AuditOutcome;
  /** Who approved a tool that needs a human. */
  approverId?: string | null;
  model?: string | null;
  promptVersion?: string | null;
  /** The agent that took the step. */
  agent?: string | null;
  /** Defaults to the ID of the request being served. */
  correlationId?: string | null;
}

/**
 * Writes the append-only audit log (ADR-010). It only ever inserts: the database itself rejects any later
 * change, so there is no update or delete here to call by mistake. Pass `db` (a transaction client) to write
 * the entry in the same transaction as the change it describes, so neither can exist without the other.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(
    entry: AuditRecord,
    db: Pick<Prisma.TransactionClient, 'auditEntry'> = this.prisma,
  ) {
    const tool = entry.tool?.trim();
    if (!tool) {
      throw new BadRequestException('An audit entry needs a tool name');
    }
    return db.auditEntry.create({
      data: {
        actorId: entry.actorId ?? null,
        actorRole: entry.actorRole ?? null,
        tool,
        parameters: entry.parameters ?? {},
        result: entry.result ?? {},
        outcome: entry.outcome,
        approverId: entry.approverId ?? null,
        model: entry.model ?? null,
        promptVersion: entry.promptVersion ?? null,
        agent: entry.agent ?? null,
        correlationId: entry.correlationId ?? currentCorrelationId() ?? null,
      },
    });
  }
}
