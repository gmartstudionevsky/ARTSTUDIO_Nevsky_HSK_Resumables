import { Prisma } from '@prisma/client';

export const accountingPositionRecordSelect = Prisma.validator<Prisma.ItemSelect>()({
  id: true,
  code: true,
  name: true,
  isActive: true,
  minQtyBase: true,
  synonyms: true,
  note: true,
  category: { select: { id: true, name: true } },
  defaultExpenseArticle: { select: { id: true, code: true, name: true } },
  defaultPurpose: { select: { id: true, code: true, name: true } },
  baseUnit: { select: { id: true, name: true } },
  defaultInputUnit: { select: { id: true, name: true } },
  reportUnit: { select: { id: true, name: true } },
});

export type AccountingPositionRecord = Prisma.ItemGetPayload<{ select: typeof accountingPositionRecordSelect }>;
