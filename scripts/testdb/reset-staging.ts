import { execSync } from 'node:child_process';

import { PrismaClient } from '@prisma/client';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for staging reset');
  }

  process.env.DATABASE_URL = databaseUrl;
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

  execSync('npm run seed:staging', { stdio: 'inherit', env: process.env });
  console.log('reset done');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
