import { PrismaClient, UiTextScope } from '@prisma/client';

import { canonicalUiTexts, shouldRepairUiTextToCanonical } from '@/lib/ui-texts/defaults';

export type SyncCanonicalUiTextsMode = 'legacy-only' | 'force';

const LEGACY_UI_TEXT_KEYS: Record<string, string[]> = {
  'nav.movements': ['nav.operation'],
  'tooltip.section': ['tooltip.purpose'],
};

async function findLegacyUiText(prisma: PrismaClient, key: string): Promise<{ key: string; ruText: string; scope: UiTextScope } | null> {
  const legacyKeys = LEGACY_UI_TEXT_KEYS[key] ?? [];
  for (const legacyKey of legacyKeys) {
    const legacy = await prisma.uiText.findUnique({ where: { key: legacyKey } });
    if (legacy) return legacy;
  }
  return null;
}

export async function syncCanonicalUiTexts(prisma: PrismaClient, mode: SyncCanonicalUiTextsMode = 'legacy-only'): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const item of canonicalUiTexts) {
    const scope = item.scope ?? UiTextScope.BOTH;
    const existing = await prisma.uiText.findUnique({ where: { key: item.key } });

    if (!existing) {
      const legacy = await findLegacyUiText(prisma, item.key);
      const ruText = legacy?.ruText ?? item.ruText;
      await prisma.uiText.create({ data: { key: item.key, ruText, scope } });
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
