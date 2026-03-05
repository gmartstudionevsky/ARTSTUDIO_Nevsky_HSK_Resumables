import { createHmac, randomBytes } from 'node:crypto';

import { requireEnv } from '@/lib/env';

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  const { SESSION_SECRET } = requireEnv();

  return createHmac('sha256', SESSION_SECRET).update(token).digest('hex');
}
