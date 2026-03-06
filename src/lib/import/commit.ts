import { ImportJobStatus, Prisma, RecordStatus, TxType } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { CommitOptions, NormalizedImportPayload } from '@/lib/import/types';

function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(6));
}

function openingBatchId(): string {
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `OPENING-20260301-${rand}`;
}

export async function commitImportJob(params: {
  jobId: string;
  userId: string;
  options?: CommitOptions;
}): Promise<{ created: Record<string, number>; openingCreated: boolean }> {
  const createOpening = params.options?.createOpening ?? true;
  const job = await prisma.importJob.findFirst({ where: { id: params.jobId, createdById: params.userId, status: ImportJobStatus.DRAFT } });
  if (!job) throw new Error('Черновик импорта не найден или уже применён.');

  const payload = job.payload as unknown as NormalizedImportPayload;
  if (payload.errors.length > 0) throw new Error('Импорт содержит ошибки. Исправьте файл и повторите предпросмотр.');

  const created = {
    categories: 0,
    units: 0,
    expenseArticles: 0,
    purposes: 0,
    items: 0,
    itemUnits: 0,
    openingLines: 0,
  };

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (createOpening) {
        const existingOpening = await tx.transaction.findFirst({
          where: { batchId: { startsWith: 'OPENING-20260301' }, note: { contains: 'Import' }, status: RecordStatus.ACTIVE },
          select: { id: true },
        });
        if (existingOpening) {
          throw new Error('Открытие склада уже импортировано.');
        }
      }

      const categories = [...new Set(payload.rows.directory.map((row) => row.category))].filter(Boolean);
      const purposeCodes = [...new Set(payload.rows.directory.map((row) => row.purposeCode))].filter(Boolean);
      const units = new Set<string>();
      payload.rows.directory.forEach((row) => {
        units.add(row.baseUnit);
        units.add(row.defaultInputUnit);
        units.add(row.reportUnit);
      });
      payload.rows.units.forEach((row) => units.add(row.unitName));

      const categoryMap = new Map<string, string>();
      for (const name of categories) {
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
      const purposeMap = new Map<string, string>();
      for (const code of purposeCodes) {
        const expenseExists = await tx.expenseArticle.findUnique({ where: { code } });
        const expense = await tx.expenseArticle.upsert({
          where: { code },
          update: { isActive: true, name: expenseExists?.name ?? code },
          create: { code, name: code, isActive: true },
        });
        if (!expenseExists) created.expenseArticles += 1;
        expenseMap.set(code, expense.id);

        const purposeExists = await tx.purpose.findUnique({ where: { code } });
        const purpose = await tx.purpose.upsert({
          where: { code },
          update: { isActive: true, name: purposeExists?.name ?? code },
          create: { code, name: code, isActive: true },
        });
        if (!purposeExists) created.purposes += 1;
        purposeMap.set(code, purpose.id);
      }

      const unitRowsByCode = new Map<string, typeof payload.rows.units>();
      for (const row of payload.rows.units) {
        const list = unitRowsByCode.get(row.itemCode) ?? [];
        list.push(row);
        unitRowsByCode.set(row.itemCode, list);
      }

      const openingLinePayload: Array<{ itemId: string; qtyInput: Prisma.Decimal; unitId: string; qtyBase: Prisma.Decimal; expenseArticleId: string; purposeId: string }> = [];

      for (const row of payload.rows.directory) {
        const existingItem = await tx.item.findUnique({ where: { code: row.code }, select: { id: true } });
        const item = await tx.item.upsert({
          where: { code: row.code },
          update: {
            name: row.name,
            categoryId: categoryMap.get(row.category) as string,
            defaultExpenseArticleId: expenseMap.get(row.purposeCode) as string,
            defaultPurposeId: purposeMap.get(row.purposeCode) as string,
            minQtyBase: row.minQtyBase === null ? null : toDecimal(row.minQtyBase),
            isActive: row.isActive,
            synonyms: row.synonyms,
            note: row.note,
            baseUnitId: unitMap.get(row.baseUnit) as string,
            defaultInputUnitId: unitMap.get(row.defaultInputUnit) as string,
            reportUnitId: unitMap.get(row.reportUnit) as string,
          },
          create: {
            code: row.code,
            name: row.name,
            categoryId: categoryMap.get(row.category) as string,
            defaultExpenseArticleId: expenseMap.get(row.purposeCode) as string,
            defaultPurposeId: purposeMap.get(row.purposeCode) as string,
            minQtyBase: row.minQtyBase === null ? null : toDecimal(row.minQtyBase),
            isActive: row.isActive,
            synonyms: row.synonyms,
            note: row.note,
            baseUnitId: unitMap.get(row.baseUnit) as string,
            defaultInputUnitId: unitMap.get(row.defaultInputUnit) as string,
            reportUnitId: unitMap.get(row.reportUnit) as string,
          },
        });
        if (!existingItem) created.items += 1;

        const customUnits = unitRowsByCode.get(row.code) ?? [];
        const rowsToCreate = customUnits.length > 0
          ? customUnits.map((unitRow) => ({
            itemId: item.id,
            unitId: unitMap.get(unitRow.unitName) as string,
            factorToBase: toDecimal(unitRow.factorToBase),
            isAllowed: unitRow.isAllowed,
            isDefaultInput: unitRow.isDefaultInput,
            isDefaultReport: unitRow.isDefaultReport,
          }))
          : [{
            itemId: item.id,
            unitId: unitMap.get(row.baseUnit) as string,
            factorToBase: toDecimal(1),
            isAllowed: true,
            isDefaultInput: true,
            isDefaultReport: true,
          }];

        const reportUnitId = unitMap.get(row.reportUnit) as string;
        if (!rowsToCreate.some((unitRow) => unitRow.unitId === reportUnitId && unitRow.isDefaultReport)) {
          const existing = rowsToCreate.find((unitRow) => unitRow.unitId === reportUnitId);
          if (existing) {
            existing.isDefaultReport = true;
            if (!existing.isAllowed) existing.isAllowed = true;
          } else {
            rowsToCreate.push({
              itemId: item.id,
              unitId: reportUnitId,
              factorToBase: toDecimal(1),
              isAllowed: true,
              isDefaultInput: false,
              isDefaultReport: true,
            });
          }
        }

        await tx.itemUnit.deleteMany({ where: { itemId: item.id } });
        await tx.itemUnit.createMany({ data: rowsToCreate });
        created.itemUnits += rowsToCreate.length;

        if (createOpening && row.openingQty > 0) {
          const reportUnit = rowsToCreate.find((unitRow) => unitRow.unitId === reportUnitId);
          const factor = reportUnit?.factorToBase ?? toDecimal(1);
          const qtyInput = toDecimal(row.openingQty);
          openingLinePayload.push({
            itemId: item.id,
            qtyInput,
            unitId: reportUnitId,
            qtyBase: toDecimal(new Prisma.Decimal(row.openingQty).mul(factor).toNumber()),
            expenseArticleId: expenseMap.get(row.purposeCode) as string,
            purposeId: purposeMap.get(row.purposeCode) as string,
          });
        }
      }

      let openingCreated = false;
      if (createOpening && openingLinePayload.length > 0) {
        const txOpening = await tx.transaction.create({
          data: {
            batchId: openingBatchId(),
            type: TxType.IN,
            occurredAt: new Date('2026-03-01T00:00:00.000Z'),
            note: 'Открытие склада 01.03.2026 (Import)',
            createdById: params.userId,
            status: RecordStatus.ACTIVE,
          },
        });

        await tx.transactionLine.createMany({
          data: openingLinePayload.map((line) => ({ ...line, transactionId: txOpening.id, status: RecordStatus.ACTIVE })),
        });
        created.openingLines = openingLinePayload.length;
        openingCreated = true;
      }

      await tx.importJob.update({ where: { id: params.jobId }, data: { status: ImportJobStatus.COMMITTED, error: null } });

      return { openingCreated };
    }, {
      maxWait: 10_000,
      timeout: 120_000,
    });

    return { created, openingCreated: result.openingCreated };
  } catch (error) {
    await prisma.importJob.update({ where: { id: params.jobId }, data: { status: ImportJobStatus.FAILED, error: error instanceof Error ? error.message : 'Ошибка импорта' } });
    throw error;
  }
}
