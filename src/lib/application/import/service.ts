import { ImportJobStatus, Prisma, RecordStatus, MovementType } from '@prisma/client';

import { ImportApplyCommand, ImportApplyResult, ImportPreviewResult, ImportRollbackResult, ImportSyncUseCase } from '@/lib/application/import/contracts';
import { prisma } from '@/lib/db/prisma';
import { CommitOptions, NormalizedImportPayload } from '@/lib/import/types';
import { parseImportWorkbook } from '@/lib/import/xlsx/parse';
import { validateImportData } from '@/lib/import/xlsx/validate';
import { generateNextItemCode } from '@/lib/items/codeGen';
import { registerProjectionUpdate, setProjectionReceipt } from '@/lib/read-models';


type RollbackItemSnapshot = {
  accountingPositionId: string;
  itemId?: string;
  before: {
    code: string;
    name: string;
    categoryId: string;
    defaultExpenseArticleId: string;
    defaultPurposeId: string;
    minQtyBase: string | null;
    isActive: boolean;
    synonyms: string | null;
    note: string | null;
    baseUnitId: string;
    defaultInputUnitId: string;
    reportUnitId: string;
  };
  units: Array<{
    unitId: string;
    factorToBase: string;
    isAllowed: boolean;
    isDefaultInput: boolean;
    isDefaultReport: boolean;
  }>;
};

type RollbackMeta = {
  createdAccountingPositionIds: string[];
  createdItemIds?: string[];
  updatedItems: RollbackItemSnapshot[];
  openingTransactionId: string | null;
  rolledBackAt?: string;
};

function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(6));
}

function openingBatchId(): string {
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `OPENING-20260301-${rand}`;
}

async function loadDraftPayload(db: typeof prisma, jobId: string, userId: string, status: ImportJobStatus = ImportJobStatus.DRAFT): Promise<NormalizedImportPayload> {
  const job = await db.importJob.findFirst({ where: { id: jobId, createdById: userId, status } });
  if (!job) throw new Error('Черновик импорта не найден или уже применён.');
  return job.payload as unknown as NormalizedImportPayload;
}

function createDecisionsMap(payload: NormalizedImportPayload, options?: CommitOptions): Map<number, { action: 'AUTO' | 'CREATE' | 'SKIP'; accountingPositionId?: string }> {
  const decisionsMap = new Map<number, { action: 'AUTO' | 'CREATE' | 'SKIP'; accountingPositionId?: string }>();
  for (const row of payload.syncPlan?.rows ?? []) {
    if (row.status === 'MATCHED' && (row.selectedAccountingPositionId ?? row.selectedItemId)) {
      decisionsMap.set(row.rowNumber, { action: 'AUTO', accountingPositionId: row.selectedAccountingPositionId ?? row.selectedItemId ?? undefined });
    }
    if (row.status === 'SKIP') decisionsMap.set(row.rowNumber, { action: 'SKIP' });
  }
  for (const decision of options?.decisions ?? []) {
    decisionsMap.set(decision.rowNumber, { action: decision.action, accountingPositionId: decision.accountingPositionId ?? decision.itemId });
  }
  return decisionsMap;
}

interface ImportSyncDeps {
  db: typeof prisma;
  parseImportWorkbook: typeof parseImportWorkbook;
  validateImportData: typeof validateImportData;
  generateNextItemCode: typeof generateNextItemCode;
}

export function createImportSyncUseCase(deps: ImportSyncDeps = {
  db: prisma,
  parseImportWorkbook,
  validateImportData,
  generateNextItemCode,
}): ImportSyncUseCase {
  return {
    async previewFromWorkbook(input): Promise<ImportPreviewResult> {
      const parsed = await deps.parseImportWorkbook(input.buffer);
      const existingItems = await deps.db.accountingPosition.findMany({
        select: { id: true, code: true, name: true, synonyms: true, categoryId: true, category: { select: { name: true } } },
      });
      const payload = deps.validateImportData(parsed, existingItems);
      const job = await deps.db.importJob.create({
        data: {
          createdById: input.userId,
          status: ImportJobStatus.DRAFT,
          sourceFilename: input.filename || 'import.xlsx',
          payload,
        },
        select: { id: true },
      });

      return {
        jobId: job.id,
        summary: payload.summary,
        errors: payload.errors,
        warnings: payload.warnings,
        syncRows: payload.syncPlan.rows,
        openingSemantics: {
          detectedOpeningRows: payload.summary.openingLines,
          defaultMode: 'OPENING',
          assumption: 'Строки с количеством в колонке остатка трактуются как opening-init; режим можно переключить в apply options.',
        },
      };
    },

    async getDraftPayload(jobId: string, userId: string): Promise<NormalizedImportPayload> {
      return loadDraftPayload(deps.db, jobId, userId);
    },

    async apply(command: ImportApplyCommand): Promise<ImportApplyResult> {
      const createOpening = command.options?.createOpening ?? true;
      const openingEventMode = command.options?.openingEventMode ?? 'OPENING';
      const payload = await loadDraftPayload(deps.db, command.jobId, command.userId);
      if (payload.errors.length > 0) throw new Error('Импорт содержит ошибки. Исправьте файл и повторите предпросмотр.');

      const created = {
        categories: 0,
        units: 0,
        expenseArticles: 0,
        sections: 0,
        purposes: 0,
        accountingPositions: 0,
        items: 0,
        accountingPositionUnits: 0,
        itemUnits: 0,
        openingLines: 0,
        syncMatched: 0,
        syncCreated: 0,
        syncSkipped: 0,
        syncNeedsReview: 0,
      };

      const decisionsMap = createDecisionsMap(payload, command.options);
      const unresolvedBehavior = command.options?.unresolvedBehavior ?? 'CREATE';

      const txResult = await deps.db.$transaction(async (tx) => {
        const touchedAccountingPositionIds = new Set<string>();
        if (createOpening) {
          const existingOpening = await tx.transaction.findFirst({
            where: { batchId: { startsWith: 'OPENING-20260301' }, note: { contains: 'Import' }, status: RecordStatus.ACTIVE },
            select: { id: true },
          });
          if (existingOpening) throw new Error('Открытие склада уже импортировано.');
        }

        const sections = [...new Set(payload.rows.directory.map((row) => row.sectionCode))].filter(Boolean);
        const expenseArticleCodes = [...new Set(payload.rows.directory.map((row) => row.expenseArticleCode))].filter(Boolean);
        const units = new Set<string>();
        payload.rows.directory.forEach((row) => {
          units.add(row.baseUnit);
          units.add(row.defaultInputUnit);
          units.add(row.reportUnit);
        });
        payload.rows.units.forEach((row) => units.add(row.unitName));

        const categoryMap = new Map<string, string>();
        for (const name of sections) {
          const exists = await tx.category.findUnique({ where: { name } });
          const category = await tx.category.upsert({ where: { name }, update: { isActive: true }, create: { name, isActive: true } });
          if (!exists) created.categories += 1;
          categoryMap.set(name, category.id);
        }

        const unitMap = new Map<string, string>();
        for (const name of units) {
          if (!name) continue;
          const exists = await tx.unit.findUnique({ where: { name } });
          const unit = await tx.unit.upsert({ where: { name }, update: { isActive: true }, create: { name, isActive: true } });
          if (!exists) created.units += 1;
          unitMap.set(name, unit.id);
        }

        const expenseMap = new Map<string, string>();
        for (const code of expenseArticleCodes) {
          const expenseExists = await tx.expenseArticle.findUnique({ where: { code } });
          const expense = await tx.expenseArticle.upsert({ where: { code }, update: { isActive: true, name: expenseExists?.name ?? code }, create: { code, name: code, isActive: true } });
          if (!expenseExists) created.expenseArticles += 1;
          expenseMap.set(code, expense.id);
        }

          const sectionMap = new Map<string, string>();
          for (const sectionCode of sections) {
            const purposeExists = await tx.section.findUnique({ where: { code: sectionCode } });
            const purpose = await tx.section.upsert({
            where: { code: sectionCode },
            update: { isActive: true, name: purposeExists?.name ?? sectionCode },
            create: { code: sectionCode, name: sectionCode, isActive: true },
            });
          if (!purposeExists) {
            created.sections += 1;
            created.purposes += 1;
          }
          sectionMap.set(sectionCode, purpose.id);
        }

        const unitRowsByCode = new Map<string, typeof payload.rows.units>();
        for (const row of payload.rows.units) {
          const code = row.accountingPositionCode ?? row.itemCode;
          if (!code) continue;
          const list = unitRowsByCode.get(code) ?? [];
          list.push(row);
          unitRowsByCode.set(code, list);
        }

        const rollback: RollbackMeta = { createdAccountingPositionIds: [], createdItemIds: [], updatedItems: [], openingTransactionId: null };
        const openingLinePayload: Array<{ itemId: string; qtyInput: Prisma.Decimal; unitId: string; qtyBase: Prisma.Decimal; expenseArticleId: string; purposeId: string }> = [];

        for (const row of payload.rows.directory) {
          const categoryId = categoryMap.get(row.sectionCode) as string;
          const decision = decisionsMap.get(row.rowNumber);
          let targetAccountingPositionId: string | null = decision?.accountingPositionId ?? null;
          if (!targetAccountingPositionId && decision?.action === 'AUTO') {
            const planned = payload.syncPlan?.rows?.find((planRow) => planRow.rowNumber === row.rowNumber);
            targetAccountingPositionId = planned?.selectedAccountingPositionId ?? planned?.selectedItemId ?? null;
          }

          let action = decision?.action;
          if (!action) {
            const planned = payload.syncPlan?.rows?.find((planRow) => planRow.rowNumber === row.rowNumber);
            const plannedId = planned?.selectedAccountingPositionId ?? planned?.selectedItemId;
            if (planned?.status === 'MATCHED' && plannedId) {
              action = 'AUTO';
              targetAccountingPositionId = plannedId;
            } else if (planned?.status === 'NEEDS_REVIEW') {
              action = unresolvedBehavior === 'SKIP' ? 'SKIP' : 'CREATE';
              created.syncNeedsReview += 1;
            } else {
              action = 'CREATE';
            }
          }

          if (action === 'SKIP') {
            created.syncSkipped += 1;
            continue;
          }

          const existingItem = targetAccountingPositionId
            ? await tx.accountingPosition.findUnique({ where: { id: targetAccountingPositionId }, select: { id: true } })
            : await tx.accountingPosition.findFirst({ where: { OR: [{ code: row.code }, { name: row.name, categoryId }] }, select: { id: true } });

          if (existingItem && action === 'AUTO') created.syncMatched += 1;
          if (!existingItem || action === 'CREATE') created.syncCreated += 1;

          if (existingItem) {
            const snapshotItem = await tx.accountingPosition.findUnique({
              where: { id: existingItem.id },
              select: {
                id: true, code: true, name: true, categoryId: true, defaultExpenseArticleId: true, defaultPurposeId: true,
                minQtyBase: true, isActive: true, synonyms: true, note: true, baseUnitId: true, defaultInputUnitId: true, reportUnitId: true,
              },
            });
            const snapshotUnits = await tx.accountingPositionUnit.findMany({ where: { itemId: existingItem.id }, select: { unitId: true, factorToBase: true, isAllowed: true, isDefaultInput: true, isDefaultReport: true } });

            if (snapshotItem) {
              rollback.updatedItems.push({
                accountingPositionId: snapshotItem.id,
                itemId: snapshotItem.id,
                before: {
                  code: snapshotItem.code, name: snapshotItem.name, categoryId: snapshotItem.categoryId,
                  defaultExpenseArticleId: snapshotItem.defaultExpenseArticleId, defaultPurposeId: snapshotItem.defaultPurposeId,
                  minQtyBase: snapshotItem.minQtyBase?.toString() ?? null, isActive: snapshotItem.isActive, synonyms: snapshotItem.synonyms,
                  note: snapshotItem.note, baseUnitId: snapshotItem.baseUnitId, defaultInputUnitId: snapshotItem.defaultInputUnitId, reportUnitId: snapshotItem.reportUnitId,
                },
                units: snapshotUnits.map((unit) => ({ unitId: unit.unitId, factorToBase: unit.factorToBase.toString(), isAllowed: unit.isAllowed, isDefaultInput: unit.isDefaultInput, isDefaultReport: unit.isDefaultReport })),
              });
            }

            await tx.accountingPosition.update({
              where: { id: existingItem.id },
              data: {
                code: row.code,
                name: row.name,
                categoryId,
                defaultExpenseArticleId: expenseMap.get(row.expenseArticleCode) as string,
                defaultPurposeId: sectionMap.get(row.sectionCode) as string,
                minQtyBase: row.minQtyBase == null ? null : toDecimal(row.minQtyBase),
                isActive: row.isActive,
                synonyms: row.synonyms,
                note: row.note,
                baseUnitId: unitMap.get(row.baseUnit) as string,
                defaultInputUnitId: unitMap.get(row.defaultInputUnit) as string,
                reportUnitId: unitMap.get(row.reportUnit) as string,
              },
            });
          } else {
            const generatedCode = row.code || (await deps.generateNextItemCode(tx as Parameters<typeof generateNextItemCode>[0]));
            const createdItem = await tx.accountingPosition.create({
              data: {
                code: generatedCode,
                name: row.name,
                categoryId,
                defaultExpenseArticleId: expenseMap.get(row.expenseArticleCode) as string,
                defaultPurposeId: sectionMap.get(row.sectionCode) as string,
                minQtyBase: row.minQtyBase == null ? null : toDecimal(row.minQtyBase),
                isActive: row.isActive,
                synonyms: row.synonyms,
                note: row.note,
                baseUnitId: unitMap.get(row.baseUnit) as string,
                defaultInputUnitId: unitMap.get(row.defaultInputUnit) as string,
                reportUnitId: unitMap.get(row.reportUnit) as string,
              },
              select: { id: true },
            });
            rollback.createdAccountingPositionIds.push(createdItem.id);
            rollback.createdItemIds?.push(createdItem.id);
            created.accountingPositions += 1;
            created.items += 1;
            targetAccountingPositionId = createdItem.id;
          }

          const accountingPositionId = (existingItem?.id ?? targetAccountingPositionId) as string;
          touchedAccountingPositionIds.add(accountingPositionId);
          const baseUnitId = unitMap.get(row.baseUnit) as string;
          const defaultInputUnitId = unitMap.get(row.defaultInputUnit) as string;
          const reportUnitId = unitMap.get(row.reportUnit) as string;
          const unitRows = unitRowsByCode.get(row.code) ?? [];

          const dedup = new Map<string, { factorToBase: Prisma.Decimal; isAllowed: boolean; isDefaultInput: boolean; isDefaultReport: boolean }>();
          dedup.set(baseUnitId, { factorToBase: toDecimal(1), isAllowed: true, isDefaultInput: defaultInputUnitId === baseUnitId, isDefaultReport: reportUnitId === baseUnitId });

          for (const unitRow of unitRows) {
            const unitId = unitMap.get(unitRow.unitName);
            if (!unitId) continue;
            const existing = dedup.get(unitId);
            const next = {
              factorToBase: toDecimal(unitRow.factorToBase),
              isAllowed: unitRow.isAllowed,
              isDefaultInput: unitRow.isDefaultInput,
              isDefaultReport: unitRow.isDefaultReport,
            };
            if (!existing) dedup.set(unitId, next);
            else {
              existing.factorToBase = next.factorToBase;
              existing.isAllowed = existing.isAllowed || next.isAllowed;
              existing.isDefaultInput = existing.isDefaultInput || next.isDefaultInput;
              existing.isDefaultReport = existing.isDefaultReport || next.isDefaultReport;
            }
          }

          if (!dedup.has(defaultInputUnitId)) dedup.set(defaultInputUnitId, { factorToBase: toDecimal(1), isAllowed: true, isDefaultInput: true, isDefaultReport: false });
          if (!dedup.has(reportUnitId)) dedup.set(reportUnitId, { factorToBase: toDecimal(1), isAllowed: true, isDefaultInput: false, isDefaultReport: true });

          const rowsToCreate = Array.from(dedup.entries()).map(([unitId, value]) => ({ itemId: accountingPositionId, unitId, ...value }));
          await tx.accountingPositionUnit.deleteMany({ where: { itemId: accountingPositionId } });
          await tx.accountingPositionUnit.createMany({ data: rowsToCreate });
          created.accountingPositionUnits += rowsToCreate.length;
          created.itemUnits += rowsToCreate.length;

          if (createOpening && row.openingQty > 0) {
            const reportUnit = rowsToCreate.find((unitRow) => unitRow.unitId === reportUnitId);
            const factor = reportUnit?.factorToBase ?? toDecimal(1);
            const qtyInput = toDecimal(row.openingQty);
            openingLinePayload.push({
              itemId: accountingPositionId,
              qtyInput,
              unitId: reportUnitId,
              qtyBase: toDecimal(new Prisma.Decimal(row.openingQty).mul(factor).toNumber()),
              expenseArticleId: expenseMap.get(row.expenseArticleCode) as string,
              purposeId: sectionMap.get(row.sectionCode) as string,
            });
          }
        }

        let openingCreated = false;
        let openingType: MovementType | null = null;
        let openingTransactionId: string | null = null;
        if (createOpening && openingLinePayload.length > 0) {
          const txOpening = await tx.transaction.create({
            data: {
              batchId: openingBatchId(),
              type: openingEventMode === 'IN' ? MovementType.IN : MovementType.OPENING,
              occurredAt: new Date('2026-03-01T00:00:00.000Z'),
              note: `Открытие склада 01.03.2026 (Import #${command.jobId})`,
              createdById: command.userId,
              status: RecordStatus.ACTIVE,
            },
          });

          await tx.transactionLine.createMany({ data: openingLinePayload.map((line) => ({ ...line, transactionId: txOpening.id, status: RecordStatus.ACTIVE })) });
          created.openingLines = openingLinePayload.length;
          openingCreated = true;
          openingType = txOpening.type;
          openingTransactionId = txOpening.id;
          rollback.openingTransactionId = txOpening.id;
        }

        await tx.importJob.update({
          where: { id: command.jobId },
          data: {
            status: ImportJobStatus.COMMITTED,
            error: null,
            payload: {
              ...(payload as unknown as Record<string, unknown>),
              rollback,
            },
          },
        });

        return { openingCreated, openingType, openingTransactionId, touchedAccountingPositionIds: Array.from(touchedAccountingPositionIds) };
      }, { maxWait: 10_000, timeout: 120_000 });

      const projections = [
        setProjectionReceipt('catalog', null, null),
        setProjectionReceipt('admin', null, null),
      ];
      if (txResult.openingTransactionId && txResult.openingType) {
        projections.push(
          ...registerProjectionUpdate({
            projectionKinds: ['stock', 'history', 'reports', 'signals'],
            eventType: txResult.openingType,
            analyticsImpact: 'full',
            itemIds: txResult.touchedAccountingPositionIds,
            transactionId: txResult.openingTransactionId,
          }),
        );
      }

      return {
        previewSummary: payload.summary,
        applySummary: created,
        blockingFailures: payload.errors,
        warnings: payload.warnings,
        opening: { created: txResult.openingCreated, mode: txResult.openingType, lines: created.openingLines },
        projections,
        recovery: { rollbackAvailable: true, strategy: 'ROLLBACK' },
      };
    },

    async rollback(input): Promise<ImportRollbackResult> {
      const job = await deps.db.importJob.findFirst({ where: { id: input.jobId, createdById: input.userId, status: ImportJobStatus.COMMITTED } });
      if (!job) throw new Error('Коммит импорта не найден.');

      const payload = job.payload as unknown as (NormalizedImportPayload & { rollback?: RollbackMeta });
      const rollback = payload.rollback;
      if (!rollback) throw new Error('Для этого импорта откат недоступен. Выполните новый импорт, чтобы включить rollback-метаданные.');
      if (rollback.rolledBackAt) throw new Error('Этот импорт уже был откачен.');

      await deps.db.$transaction(async (tx) => {
        if (rollback.openingTransactionId) {
          await tx.transactionLine.deleteMany({ where: { transactionId: rollback.openingTransactionId } });
          await tx.transaction.deleteMany({ where: { id: rollback.openingTransactionId } });
        }

        for (const accountingPositionId of rollback.createdAccountingPositionIds) {
          const linesCount = await tx.transactionLine.count({ where: { itemId: accountingPositionId } });
          if (linesCount > 0) throw new Error('Нельзя откатить импорт: по новым позициям уже есть движения.');
          await tx.accountingPositionUnit.deleteMany({ where: { itemId: accountingPositionId } });
          await tx.accountingPosition.deleteMany({ where: { id: accountingPositionId } });
        }

        for (const item of rollback.updatedItems) {
          const accountingPositionId = item.accountingPositionId;
          await tx.accountingPosition.update({
            where: { id: accountingPositionId },
            data: {
              code: item.before.code,
              name: item.before.name,
              categoryId: item.before.categoryId,
              defaultExpenseArticleId: item.before.defaultExpenseArticleId,
              defaultPurposeId: item.before.defaultPurposeId,
              minQtyBase: item.before.minQtyBase === null ? null : new Prisma.Decimal(item.before.minQtyBase),
              isActive: item.before.isActive,
              synonyms: item.before.synonyms,
              note: item.before.note,
              baseUnitId: item.before.baseUnitId,
              defaultInputUnitId: item.before.defaultInputUnitId,
              reportUnitId: item.before.reportUnitId,
            },
          });
          await tx.accountingPositionUnit.deleteMany({ where: { itemId: accountingPositionId } });
          if (item.units.length > 0) {
            await tx.accountingPositionUnit.createMany({
              data: item.units.map((unit) => ({
                itemId: accountingPositionId,
                unitId: unit.unitId,
                factorToBase: new Prisma.Decimal(unit.factorToBase),
                isAllowed: unit.isAllowed,
                isDefaultInput: unit.isDefaultInput,
                isDefaultReport: unit.isDefaultReport,
              })),
            });
          }
        }

        await tx.importJob.update({
          where: { id: input.jobId },
          data: {
            payload: {
              ...(payload as unknown as Record<string, unknown>),
              rollback: {
                ...rollback,
                rolledBackAt: new Date().toISOString(),
              },
            },
          },
        });
      }, { maxWait: 10_000, timeout: 120_000 });

      const projections = [
        setProjectionReceipt('catalog', null, null),
        setProjectionReceipt('admin', null, null),
        setProjectionReceipt('stock', null, null),
        setProjectionReceipt('history', null, null),
        setProjectionReceipt('reports', null, null),
        setProjectionReceipt('signals', null, null),
      ];

      return { rolledBack: true, projections };
    },
  };
}
