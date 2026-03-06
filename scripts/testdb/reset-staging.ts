import { execSync } from 'node:child_process';

import { PrismaClient } from '@prisma/client';


function hasUnescapedPasswordChars(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    const rawPassword = parsed.password;
    return /[#!?&]/.test(rawPassword);
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.STAGING_DATABASE_URL ?? process.env.E2E_DATABASE_URL;
  const directUrl = process.env.DIRECT_URL ?? process.env.STAGING_DIRECT_URL ?? process.env.E2E_DIRECT_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for staging reset (or provide STAGING_DATABASE_URL / E2E_DATABASE_URL)');
  }

  process.env.DATABASE_URL = databaseUrl;
  process.env.DIRECT_URL = directUrl ?? databaseUrl;

  if (hasUnescapedPasswordChars(databaseUrl)) {
    console.warn('[reset-staging] DATABASE_URL password may require URL-encoding (e.g. # -> %23, ? -> %3F, & -> %26, ! -> %21).');
  }

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

  execSync('npm run seed:staging', { stdio: 'inherit', env: process.env });
  console.log('reset done');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('invalid port number in database URL')) {
    console.error('[reset-staging] Invalid DATABASE_URL format. Ensure password special chars are URL-encoded.');
  }
  if (message.includes("Can't reach database server")) {
    console.error('[reset-staging] Database host is unreachable from current environment. Check network access/firewall/VPN and host:port.');
  }
  console.error(error);
  process.exit(1);
});
