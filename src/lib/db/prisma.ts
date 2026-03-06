import { PrismaClient } from '@prisma/client';

import { requireEnv } from '@/lib/env';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  requireEnv();

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

function getPrismaClient(): PrismaClient {
  if (global.prisma) {
    return global.prisma;
  }

  const client = createPrismaClient();

  global.prisma = client;

  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client as object, prop, receiver);

    return typeof value === 'function' ? value.bind(client) : value;
  }
});
