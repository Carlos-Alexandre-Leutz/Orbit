import 'reflect-metadata';
import { Role } from '@prisma/client';
import { createCustomerTools } from '../tools/customer-tools';
import { Tool } from '../tools/tool';
import { ToolRegistry } from '../tools/tool-registry';
import { GovernancePolicy, PolicyDocument } from './governance-policy';
import { loadPolicy, POLICY_VERSIONS } from './policy-loader';
import { PolicyError, validatePolicy } from './policy-validator';

const realTools = new ToolRegistry(
  createCustomerTools({ products: {}, cart: {}, orders: {} } as never),
);
const lookup = (name: string) => realTools.get(name);
const never = () => Promise.resolve(0);

describe('policy version 1 against the real tools', () => {
  it('is valid for the tools that exist', () => {
    expect(() => validatePolicy(POLICY_VERSIONS[1], lookup)).not.toThrow();
    expect(loadPolicy(lookup, never).version).toBe(1);
  });

  it('gives each role exactly the tools it should have', () => {
    const policy = loadPolicy(lookup, never);
    const customerTools = [
      'cart.add_item',
      'cart.view',
      'catalog.search',
      'orders.cancel',
      'orders.place',
      'orders.status',
    ];
    expect(policy.toolsOf(Role.CUSTOMER).sort()).toEqual(customerTools);
    expect(policy.toolsOf(Role.SELLER).sort()).toEqual(customerTools);
    expect(policy.toolsOf(Role.ADMIN)).toEqual([]);
  });

  it('never allows a role to use a tool the tool itself refuses it', () => {
    const policy = loadPolicy(lookup, never);
    for (const role of Object.values(Role)) {
      for (const name of policy.toolsOf(role)) {
        expect(realTools.get(name)?.roles).toContain(role);
      }
    }
  });

  it.each([Role.CUSTOMER, Role.SELLER])(
    '%s: can search, shop and buy, buying needs approval',
    async (role) => {
      const policy = loadPolicy(lookup, never);
      const actor = { id: 'u', role };
      expect(
        await policy.check({ actor, tool: 'catalog.search' }),
      ).toMatchObject({ allowed: true, requiresApproval: false });
      expect(
        await policy.check({ actor, tool: 'orders.place', amountCents: 1000 }),
      ).toMatchObject({
        allowed: true,
        requiresApproval: true,
        highValueCents: 50_000,
      });
    },
  );

  it('refuses every tool to an admin and any tool that is not listed', async () => {
    const policy = loadPolicy(lookup, never);
    expect(
      await policy.check({
        actor: { id: 'a', role: Role.ADMIN },
        tool: 'catalog.search',
      }),
    ).toMatchObject({ allowed: false, code: 'FORBIDDEN' });
    expect(
      await policy.check({
        actor: { id: 'u', role: Role.CUSTOMER },
        tool: 'admin.suspend_store',
      }),
    ).toMatchObject({ allowed: false, code: 'FORBIDDEN' });
  });

  it('caps the amount of a purchase', async () => {
    const policy = loadPolicy(lookup, never);
    const actor = { id: 'u', role: Role.CUSTOMER };
    expect(
      await policy.check({
        actor,
        tool: 'orders.place',
        amountCents: 1_000_000,
      }),
    ).toMatchObject({ allowed: true });
    expect(
      await policy.check({
        actor,
        tool: 'orders.place',
        amountCents: 1_000_001,
      }),
    ).toMatchObject({ allowed: false, code: 'LIMIT_EXCEEDED' });
  });
});

describe('call limits', () => {
  const document: PolicyDocument = {
    version: 1,
    roles: {
      CUSTOMER: {
        tools: { 'catalog.search': { maxCallsPerHour: 2, maxCallsPerDay: 5 } },
      },
    },
  };
  const actor = { id: 'u', role: Role.CUSTOMER };

  it('counts the calls of this actor and tool in the last hour and the last day', async () => {
    const counter = jest.fn().mockResolvedValue(0);
    const policy = new GovernancePolicy(document, counter, () => 1_000_000_000);
    await policy.check({ actor, tool: 'catalog.search' });
    expect(counter).toHaveBeenNthCalledWith(
      1,
      'u',
      'catalog.search',
      new Date(1_000_000_000 - 3_600_000),
    );
    expect(counter).toHaveBeenNthCalledWith(
      2,
      'u',
      'catalog.search',
      new Date(1_000_000_000 - 86_400_000),
    );
  });

  it('refuses at the limit, saying which one', async () => {
    const hourly = new GovernancePolicy(document, (_a, _t, since) =>
      Promise.resolve(Date.now() - since.getTime() < 4_000_000 ? 2 : 2),
    );
    expect(await hourly.check({ actor, tool: 'catalog.search' })).toMatchObject(
      {
        allowed: false,
        code: 'LIMIT_EXCEEDED',
        message: expect.stringMatching(/2 calls per hour/),
      },
    );
    const daily = new GovernancePolicy(document, (_a, _t, since) =>
      Promise.resolve(Date.now() - since.getTime() > 4_000_000 ? 5 : 1),
    );
    expect(await daily.check({ actor, tool: 'catalog.search' })).toMatchObject({
      allowed: false,
      message: expect.stringMatching(/5 calls per day/),
    });
  });

  it('allows below the limits', async () => {
    const policy = new GovernancePolicy(document, () => Promise.resolve(1));
    expect(await policy.check({ actor, tool: 'catalog.search' })).toMatchObject(
      { allowed: true },
    );
  });
});

describe('validatePolicy', () => {
  const tool = (extra: Partial<Tool> = {}): Tool => ({
    name: 'x.y',
    description: '',
    inputSchema: {},
    roles: [Role.CUSTOMER],
    sideEffect: true,
    requiresApproval: false,
    parse: (i) => i,
    run: () => Promise.resolve(null),
    ...extra,
  });
  const only = (t: Tool) => (name: string) => (name === t.name ? t : undefined);
  const policy = (rule: unknown, role = 'CUSTOMER', version: unknown = 1) => ({
    version,
    roles: { [role]: { tools: { 'x.y': rule } } },
  });
  const problems = (raw: unknown, t = tool()) => {
    try {
      validatePolicy(raw, only(t));
      return [];
    } catch (error) {
      return (error as PolicyError).problems;
    }
  };

  it('accepts a good policy', () => {
    expect(
      problems(
        policy({
          requiresApproval: true,
          maxAmountCents: 10,
          highValueCents: 5,
          maxCallsPerHour: 1,
          maxCallsPerDay: 2,
        }),
      ),
    ).toEqual([]);
  });

  it.each([
    [
      'a missing tool',
      policy({}, 'CUSTOMER'),
      tool({ name: 'other.tool' }),
      /no such tool/,
    ],
    ['an unknown role', policy({}, 'WIZARD'), undefined, /unknown role WIZARD/],
    [
      'a role the tool refuses',
      policy({}, 'SELLER'),
      undefined,
      /does not allow this role/,
    ],
    [
      'an unknown field',
      policy({ maxCalls: 1 }),
      undefined,
      /unknown field maxCalls/,
    ],
    [
      'a limit that is not a positive integer',
      policy({ maxAmountCents: -5 }),
      undefined,
      /maxAmountCents must be a positive integer/,
    ],
    [
      'a decimal limit',
      policy({ maxCallsPerHour: 1.5 }),
      undefined,
      /maxCallsPerHour/,
    ],
    ['a bad version', policy({}, 'CUSTOMER', 0), undefined, /version/],
    [
      'approval on a tool that changes nothing',
      policy({ requiresApproval: true }),
      tool({ sideEffect: false }),
      /only a tool with a side effect/,
    ],
    [
      'lowering the approval of the tool',
      policy({ requiresApproval: false }),
      tool({ requiresApproval: true }),
      /cannot lower/,
    ],
    [
      'a high-value limit with no approval',
      policy({ highValueCents: 5 }),
      undefined,
      /highValueCents only makes sense/,
    ],
    [
      'a rule that is not an object',
      policy('yes'),
      undefined,
      /rule must be an object/,
    ],
  ])('rejects %s', (_label, raw, t, message) => {
    expect(problems(raw, t).join('\n')).toMatch(message);
  });

  it('lists every problem at once', () => {
    expect(problems(policy({ maxCallsPerHour: 0, foo: 1 })).length).toBe(2);
  });

  it('rejects something that is not a policy', () => {
    expect(problems(null)).toEqual(['the policy must be an object']);
    expect(problems({ version: 1 })).toContain('roles must be an object');
  });
});

describe('loadPolicy', () => {
  it('uses POLICY_VERSION and refuses a version that does not exist', () => {
    expect(loadPolicy(lookup, never, { POLICY_VERSION: '1' }).version).toBe(1);
    expect(() => loadPolicy(lookup, never, { POLICY_VERSION: '9' })).toThrow(
      /no governance policy version 9/,
    );
  });
});
