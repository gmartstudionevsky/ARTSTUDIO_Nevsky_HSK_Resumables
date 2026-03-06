import { execSync } from 'node:child_process';

import { PrismaClient } from '@prisma/client';

function assertSafeLocalTestDb(databaseUrl: string): void {
  const parsed = new URL(databaseUrl);
  const host = parsed.hostname.toLowerCase();
  const blockedHostFragments = ['supabase.co', 'pooler.supabase.com', 'render.com', 'neon.tech', 'railway.app'];

  if (blockedHostFragments.some((fragment) => host.includes(fragment))) {
    throw new Error(
      `Refusing destructive reset: DATABASE_URL host '${parsed.hostname}' looks like managed/remote DB. Use only local or ephemeral CI PostgreSQL.`,
    );
  }

  const allowedHosts = new Set(['localhost', '127.0.0.1', 'postgres']);
  if (!allowedHosts.has(host)) {
    throw new Error(
      `Refusing destructive reset: DATABASE_URL host '${parsed.hostname}' is not allowed. Allowed hosts: localhost, 127.0.0.1, postgres.`,
    );
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for local/e2e reset');
  }

  assertSafeLocalTestDb(databaseUrl);

  process.env.DIRECT_URL = process.env.DIRECT_URL ?? databaseUrl;

  const prisma = new PrismaClient();

  try {
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename <> '_prisma_migrations'
    `;

    if (tables.length > 0) {
      const quotedTables = tables.map(({ tablename }) => `"public"."${tablename.replace(/"/g, '""')}"`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quotedTables.join(', ')} RESTART IDENTITY CASCADE`);
    }
  } finally {
    await prisma.$disconnect();
  }

  execSync('npm run seed:test:e2e', { stdio: 'inherit', env: process.env });
  console.log('Local/e2e test DB reset complete.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
