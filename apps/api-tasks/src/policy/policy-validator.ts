import { Role } from '@prisma/client';
import { Tool } from '../tools/tool';
import { PolicyDocument, RULE_KEYS } from './governance-policy';

export class PolicyError extends Error {
  constructor(readonly problems: string[]) {
    super(`The governance policy is not valid:\n- ${problems.join('\n- ')}`);
  }
}

const isCount = (value: unknown) =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

/**
 * Checks a raw policy against the tools that exist, and lists every problem at once. A policy that names a
 * tool that does not exist, gives a role a tool the tool refuses it, or tries to lower a tool's own approval
 * requirement stops the API from starting, so a typo can never become a silent hole.
 */
export function validatePolicy(
  raw: unknown,
  tools: (name: string) => Tool | undefined,
): PolicyDocument {
  const problems: string[] = [];
  const doc = raw as Partial<PolicyDocument> | null;
  if (!doc || typeof doc !== 'object') {
    throw new PolicyError(['the policy must be an object']);
  }
  if (!isCount(doc.version))
    problems.push('version must be a positive integer');
  if (!doc.roles || typeof doc.roles !== 'object') {
    problems.push('roles must be an object');
  }
  for (const [role, entry] of Object.entries(doc.roles ?? {})) {
    if (!(role in Role)) {
      problems.push(`unknown role ${role}`);
      continue;
    }
    const rules = (entry as { tools?: Record<string, unknown> } | undefined)
      ?.tools;
    if (!rules || typeof rules !== 'object') {
      problems.push(`${role}: tools must be an object`);
      continue;
    }
    for (const [name, rule] of Object.entries(rules)) {
      const where = `${role}/${name}`;
      const tool = tools(name);
      if (!tool) {
        problems.push(`${where}: there is no such tool`);
        continue;
      }
      if (!tool.roles.includes(role as Role)) {
        problems.push(`${where}: the tool itself does not allow this role`);
      }
      if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
        problems.push(`${where}: the rule must be an object`);
        continue;
      }
      const fields = rule as Record<string, unknown>;
      for (const key of Object.keys(fields)) {
        if (!(RULE_KEYS as readonly string[]).includes(key)) {
          problems.push(`${where}: unknown field ${key}`);
        }
      }
      for (const key of [
        'maxAmountCents',
        'highValueCents',
        'maxCallsPerHour',
        'maxCallsPerDay',
      ]) {
        if (key in fields && !isCount(fields[key])) {
          problems.push(`${where}: ${key} must be a positive integer`);
        }
      }
      if ('requiresApproval' in fields) {
        if (typeof fields.requiresApproval !== 'boolean') {
          problems.push(`${where}: requiresApproval must be true or false`);
        } else if (fields.requiresApproval && !tool.sideEffect) {
          problems.push(
            `${where}: only a tool with a side effect can need approval`,
          );
        } else if (!fields.requiresApproval && tool.requiresApproval) {
          problems.push(
            `${where}: the policy cannot lower the approval the tool asks for`,
          );
        }
      }
      const approval =
        tool.requiresApproval || fields.requiresApproval === true;
      if ('highValueCents' in fields && !approval) {
        problems.push(
          `${where}: highValueCents only makes sense for a tool that needs approval`,
        );
      }
    }
  }
  if (problems.length) throw new PolicyError(problems);
  return doc as PolicyDocument;
}
