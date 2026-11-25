import { Logger, OnModuleDestroy } from '@nestjs/common';
import { Collection, MongoClient } from 'mongodb';
import { TraceStep } from './correlation';

/** What one request left behind: enough to follow it, never its body or its query values. */
export interface ExecutionTrace {
  correlationId: string;
  method: string;
  route: string;
  status: number;
  durationMs: number;
  startedAt: Date;
  actorId?: string;
  error?: string;
  steps: TraceStep[];
}

/** The port: where traces go. Saving must never fail the request that made the trace. */
export abstract class TraceStore {
  abstract save(trace: ExecutionTrace): Promise<void>;
}

/** Used when no MongoDB is configured: traces are dropped. */
export class NoopTraceStore extends TraceStore {
  save(): Promise<void> {
    return Promise.resolve();
  }
}

/** Keeps traces in MongoDB, in the `execution_traces` collection, and lets old ones expire. */
export class MongoTraceStore extends TraceStore implements OnModuleDestroy {
  private readonly logger = new Logger(MongoTraceStore.name);
  private readonly client: MongoClient;
  private collection?: Promise<Collection<ExecutionTrace>>;

  constructor(
    url: string,
    private readonly ttlDays = 30,
  ) {
    super();
    this.client = new MongoClient(url, { serverSelectionTimeoutMS: 2000 });
  }

  private open(): Promise<Collection<ExecutionTrace>> {
    this.collection ??= (async () => {
      await this.client.connect();
      const collection = this.client
        .db()
        .collection<ExecutionTrace>('execution_traces');
      const expireAfterSeconds = this.ttlDays * 24 * 60 * 60;
      try {
        await collection.createIndex({ startedAt: 1 }, { expireAfterSeconds });
      } catch (error) {
        // The index exists with another lifetime (TRACE_TTL_DAYS changed): update it instead of failing.
        const code = (error as { code?: number }).code;
        if (code !== 85 && code !== 86) throw error;
        await this.client.db().command({
          collMod: 'execution_traces',
          index: { keyPattern: { startedAt: 1 }, expireAfterSeconds },
        });
      }
      await collection.createIndex({ correlationId: 1 });
      return collection;
    })();
    // A failed first try must not stick: the next trace tries again.
    this.collection.catch(() => (this.collection = undefined));
    return this.collection;
  }

  async save(trace: ExecutionTrace): Promise<void> {
    try {
      await (await this.open()).insertOne({ ...trace });
    } catch (error) {
      this.logger.warn(
        `Could not save trace ${trace.correlationId}: ${(error as Error).message}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.client.close().catch(() => undefined);
  }
}
