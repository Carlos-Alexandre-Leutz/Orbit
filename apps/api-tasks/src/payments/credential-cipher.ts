import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';

const VERSION = 'v1';

/** The key that protects what sellers paste: 32 random bytes in base64 (`openssl rand -base64 32`). */
function keyFrom(env: NodeJS.ProcessEnv): Buffer {
  const raw = env.PAYMENT_ENCRYPTION_KEY?.trim();
  const key = raw ? Buffer.from(raw, 'base64') : undefined;
  if (!key || key.length !== 32) {
    throw new Error(
      'PAYMENT_ENCRYPTION_KEY must be 32 bytes in base64 to store payment credentials',
    );
  }
  return key;
}

/** True when sellers' payment credentials can be stored here. */
export function canStoreCredentials(env: NodeJS.ProcessEnv = process.env) {
  try {
    keyFrom(env);
    return true;
  } catch {
    return false;
  }
}

/** AES-256-GCM: the text comes back only with the same key, and any change to it is detected. */
export function encryptCredentials(
  plain: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFrom(env), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), body]
    .map((part) => (typeof part === 'string' ? part : part.toString('base64')))
    .join(':');
}

export function decryptCredentials(
  stored: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const [version, iv, tag, body] = stored.split(':');
  if (version !== VERSION || !iv || !tag || !body) {
    throw new Error('Unknown credential format');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    keyFrom(env),
    Buffer.from(iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(body, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
