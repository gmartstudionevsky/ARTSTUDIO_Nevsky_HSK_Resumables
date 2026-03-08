import { PrismaClient, UiTextScope } from '@prisma/client';

import { canonicalUiTexts, shouldRepairUiTextToCanonical } from '@/lib/ui-texts/defaults';

export type SyncCanonicalUiTextsMode = 'legacy-only' | 'force';

export async function syncCanonicalUiTexts(prisma: PrismaClient, mode: SyncCanonicalUiTextsMode = 'legacy-only'): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const item of canonicalUiTexts) {
    const scope = item.scope ?? UiTextScope.BOTH;
    const existing = await prisma.uiText.findUnique({ where: { key: item.key } });

    if (!existing) {
      await prisma.uiText.create({ data: { key: item.key, ruText: item.ruText, scope } });
      created += 1;
      continue;
    }

    const mustUpdate = mode === 'force'
      ? existing.ruText !== item.ruText || existing.scope !== scope
      : shouldRepairUiTextToCanonical({ key: item.key, currentText: existing.ruText, canonicalText: item.ruText }) || existing.scope !== scope;

    if (mustUpdate) {
      await prisma.uiText.update({
        where: { key: item.key },
        data: { ruText: item.ruText, scope },
      });
      updated += 1;
    }
  }

  return { created, updated };
}
