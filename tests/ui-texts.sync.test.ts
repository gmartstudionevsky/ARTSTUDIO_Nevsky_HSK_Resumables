import assert from 'node:assert/strict';
import test from 'node:test';

import { syncCanonicalUiTexts } from '../src/lib/ui-texts/sync';

test('syncCanonicalUiTexts: repairs legacy nav.catalog text in legacy-only mode', async () => {
  const updates: Array<{ key: string; ruText: string }> = [];
  const creates: string[] = [];

  const prisma = {
    uiText: {
      findUnique: async ({ where }: any) => {
        if (where.key === 'nav.catalog') return { key: 'nav.catalog', ruText: 'Номенклатура', scope: 'BOTH' };
        return { key: where.key, ruText: 'ok', scope: 'BOTH' };
      },
      create: async ({ data }: any) => {
        creates.push(data.key);
        return data;
      },
      update: async ({ where, data }: any) => {
        updates.push({ key: where.key, ruText: data.ruText });
        return { ...where, ...data };
      },
    },
  } as any;

  const result = await syncCanonicalUiTexts(prisma, 'legacy-only');

  assert.equal(result.updated, 1);
  assert.equal(result.created, 0);
  assert.deepEqual(creates, []);
  assert.equal(updates[0]?.key, 'nav.catalog');
  assert.equal(updates[0]?.ruText, 'Каталог позиций');
});

test('syncCanonicalUiTexts: creates canonical key from legacy alias key', async () => {
  const creates: Array<{ key: string; ruText: string }> = [];

  const prisma = {
    uiText: {
      findUnique: async ({ where }: any) => {
        if (where.key === 'nav.movements') return null;
        if (where.key === 'nav.operation') return { key: 'nav.operation', ruText: 'Операции', scope: 'BOTH' };
        return { key: where.key, ruText: 'ok', scope: 'BOTH' };
      },
      create: async ({ data }: any) => {
        creates.push({ key: data.key, ruText: data.ruText });
        return data;
      },
      update: async ({ where, data }: any) => ({ ...where, ...data }),
    },
  } as any;

  await syncCanonicalUiTexts(prisma, 'legacy-only');

  assert.deepEqual(creates.find((item) => item.key === 'nav.movements'), { key: 'nav.movements', ruText: 'Операции' });
});


test('syncCanonicalUiTexts: creates canonical tooltip key from legacy alias key', async () => {
  const creates: Array<{ key: string; ruText: string }> = [];

  const prisma = {
    uiText: {
      findUnique: async ({ where }: any) => {
        if (where.key === 'tooltip.section') return null;
        if (where.key === 'tooltip.purpose') return { key: 'tooltip.purpose', ruText: 'Раздел — основной рабочий контекст движения и учёта.', scope: 'BOTH' };
        return { key: where.key, ruText: 'ok', scope: 'BOTH' };
      },
      create: async ({ data }: any) => {
        creates.push({ key: data.key, ruText: data.ruText });
        return data;
      },
      update: async ({ where, data }: any) => ({ ...where, ...data }),
    },
  } as any;

  await syncCanonicalUiTexts(prisma, 'legacy-only');

  assert.deepEqual(creates.find((item) => item.key === 'tooltip.section'), {
    key: 'tooltip.section',
    ruText: 'Раздел — основной рабочий контекст движения и учёта.',
  });
});
