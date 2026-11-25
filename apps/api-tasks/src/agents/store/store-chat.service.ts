import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { StoresService } from '../../stores/stores.service';
import { AgentLoop } from '../agent-loop';
import { SlidingLimiter } from './rate-limit';
import { STORE_AGENT } from './store-agent';

const HOUR = 3_600_000;

export interface StoreChatRequest {
  visitorId: string;
  message: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
}

/**
 * The public chat of a store. Anyone who opens a store's link may ask it questions, so it is limited per
 * visitor and per store, and it only runs for a store that is open to the public. The conversation lives
 * in the visitor's browser: the page sends the last messages with each question.
 */
@Injectable()
export class StoreChatService {
  private readonly perVisitor = new SlidingLimiter(
    Number(process.env.STORE_CHAT_PER_VISITOR_HOUR) || 30,
    HOUR,
  );
  private readonly perStore = new SlidingLimiter(
    Number(process.env.STORE_CHAT_PER_STORE_HOUR) || 300,
    HOUR,
  );

  constructor(
    private readonly stores: StoresService,
    private readonly loop: AgentLoop,
  ) {}

  async ask(slug: string, request: StoreChatRequest) {
    const store = await this.stores.bySlug(slug);
    // A draft or suspended store is closed to visitors, so its chat is too.
    if (!store.published || store.suspendedAt) {
      throw new NotFoundException('Store not found');
    }
    if (
      !this.perVisitor.allow(`${store.id}:${request.visitorId}`) ||
      !this.perStore.allow(store.id)
    ) {
      throw new HttpException(
        'Too many questions for now. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const result = await this.loop.run({
      agent: STORE_AGENT,
      // A visitor has no account: the id only groups the audit entries and the call limits of the policy.
      actor: { id: `visitor:${request.visitorId}`, role: Role.CUSTOMER },
      store: { id: store.id, slug: store.slug },
      message: request.message,
      history: request.history,
    });
    return { message: result.message, status: result.status };
  }
}
