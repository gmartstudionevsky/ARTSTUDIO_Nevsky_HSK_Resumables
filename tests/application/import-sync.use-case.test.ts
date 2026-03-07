import assert from 'node:assert/strict';
import test from 'node:test';

import { createImportSyncUseCase } from '../../src/lib/application/import/service';

test('previewFromWorkbook: creates draft with summary/sync/outcome contract', async () => {
  const created: { data?: unknown } = {};
  const useCase = createImportSyncUseCase({
    db: {
      item: { findMany: async () => [] },
      importJob: {
        create: async ({ data }: any) => {
          created.data = data;
          return { id: 'job-1' };
        },
      },
    } as any,
    parseImportWorkbook: async () => ({ directoryRows: [], unitRows: [], parseErrors: [] }),
    validateImportData: () => ({
      summary: {
        items: 1,
        categories: 1,
        units: 1,
        expenseArticles: 1,
        purposes: 1,
        itemUnits: 1,
        openingLines: 1,
        syncMatched: 0,
        syncCreated: 1,
        syncSkipped: 0,
        syncNeedsReview: 0,
      },
      errors: [],
      warnings: [],
      rows: { directory: [], units: [] },
      syncPlan: { mode: 'AUTO', rows: [] },
    }),
    generateNextItemCode: async () => 'IT-001',
  });

  const result = await useCase.previewFromWorkbook({ userId: 'u-1', filename: 'import.xlsx', buffer: new ArrayBuffer(0) });

  assert.equal(result.jobId, 'job-1');
  assert.equal(result.summary.openingLines, 1);
  assert.equal(result.openingSemantics.defaultMode, 'OPENING');
  assert.equal((created.data as any).createdById, 'u-1');
});

test('apply: blocks commit when preview has blocking errors', async () => {
  const useCase = createImportSyncUseCase({
    db: {
      importJob: {
        findFirst: async () => ({
          payload: {
            summary: {
              items: 0,
              categories: 0,
              units: 0,
              expenseArticles: 0,
              purposes: 0,
              itemUnits: 0,
              openingLines: 0,
              syncMatched: 0,
              syncCreated: 0,
              syncSkipped: 0,
              syncNeedsReview: 0,
            },
            errors: [{ sheet: 'Справочник', row: 2, column: 'Код позиции', message: 'Ошибка' }],
            warnings: [],
            rows: { directory: [], units: [] },
            syncPlan: { mode: 'AUTO', rows: [] },
          },
        }),
      },
    } as any,
    parseImportWorkbook: async () => ({ directoryRows: [], unitRows: [], parseErrors: [] }),
    validateImportData: () => {
      throw new Error('not used');
    },
    generateNextItemCode: async () => 'IT-001',
  });

  await assert.rejects(
    () => useCase.apply({ jobId: 'job-1', userId: 'u-1' }),
    /Импорт содержит ошибки/,
  );
});
