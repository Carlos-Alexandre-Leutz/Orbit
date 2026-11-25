import { GovernancePolicy, CallCounter } from './governance-policy';
import { validatePolicy } from './policy-validator';
import { Tool } from '../tools/tool';
import { POLICY_V1 } from './versions/v1';
import { POLICY_V2 } from './versions/v2';

/** Every version that exists, by number. A new version is a new file added here, never an edit of an old one. */
export const POLICY_VERSIONS: Record<number, unknown> = {
  1: POLICY_V1,
  2: POLICY_V2,
};

/** `POLICY_VERSION` picks one; without it the newest is used. */
export function loadPolicy(
  tools: (name: string) => Tool | undefined,
  countCalls: CallCounter,
  env: NodeJS.ProcessEnv = process.env,
): GovernancePolicy {
  const newest = Math.max(...Object.keys(POLICY_VERSIONS).map(Number));
  const wanted = env.POLICY_VERSION ? Number(env.POLICY_VERSION) : newest;
  const raw = POLICY_VERSIONS[wanted];
  if (!raw) {
    throw new Error(
      `There is no governance policy version ${env.POLICY_VERSION}`,
    );
  }
  const document = validatePolicy(raw, tools);
  if (document.version !== wanted) {
    throw new Error(
      `Policy file ${wanted} says it is version ${document.version}`,
    );
  }
  return new GovernancePolicy(document, countCalls);
}
