import { Injectable } from '@nestjs/common';
import { AgentLoop } from './agent-loop';
import { Actor, AgentResult, Emit } from './agent';
import { CUSTOMER_AGENT } from './customer/customer-agent';
import { IntentRouter } from './router/intent-router';

const SHOPPING_ROUTES = ['catalog', 'cart', 'orders', 'general'];

/**
 * The entry point of a chat message: the router decides where it goes (and when a human takes over), and
 * the agent behind the route does the work. The customer agent serves the shopping routes; the seller agent
 * does not exist yet, so a seller's store questions get an honest answer instead of a wrong agent.
 */
@Injectable()
export class Orchestrator {
  constructor(
    private readonly router: IntentRouter,
    private readonly loop: AgentLoop,
  ) {}

  async handle(request: {
    actor: Actor;
    message: string;
    history?: { role: 'user' | 'assistant'; content: string }[];
    emit?: Emit;
  }): Promise<AgentResult> {
    const emit = request.emit ?? (() => undefined);
    const decision = await this.router.route(request);
    const end = (
      status: AgentResult['status'],
      message: string,
    ): AgentResult => {
      emit({ type: 'message', text: message });
      emit({ type: 'done', status, steps: 0, costMicroUsd: 0 });
      return { status, message, steps: 0, costMicroUsd: 0 };
    };

    switch (decision.action) {
      case 'clarify':
        return end('clarify', decision.question);
      case 'refuse':
        return end('refused', decision.message);
      case 'escalate':
        return end(
          'escalated',
          'I am passing this to a person from the team, who will reply here.',
        );
      case 'route':
        if (SHOPPING_ROUTES.includes(decision.route)) {
          return this.loop.run({ ...request, agent: CUSTOMER_AGENT });
        }
        return end(
          'answered',
          'The store management assistant is not available yet. You can use the seller panel meanwhile.',
        );
    }
  }
}
