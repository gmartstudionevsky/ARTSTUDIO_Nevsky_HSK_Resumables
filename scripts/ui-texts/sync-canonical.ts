import { PrismaClient } from '@prisma/client';

import { syncCanonicalUiTexts } from '../../src/lib/ui-texts/sync';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const mode = (process.argv[2] as 'legacy-only' | 'force' | undefined) ?? 'legacy-only';
    const result = await syncCanonicalUiTexts(prisma, mode);
    console.log(`Canonical ui_texts sync complete (mode=${mode}): created=${result.created}, updated=${result.updated}.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
