import { AccountingPosition } from '@/lib/domain/accounting-position/types';

interface ItemLegacyRecord {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  minQtyBase: { toString(): string } | string | null;
  synonyms: string | null;
  note: string | null;
  category: { id: string; name: string };
  defaultExpenseArticle: { id: string; code: string; name: string };
  defaultPurpose: { id: string; code: string; name: string };
  baseUnit: { id: string; name: string };
  defaultInputUnit: { id: string; name: string };
  reportUnit: { id: string; name: string };
}

export function mapItemRecordToAccountingPosition(item: ItemLegacyRecord): AccountingPosition {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    isActive: item.isActive,
    category: item.category,
    defaultExpenseArticle: item.defaultExpenseArticle,
    defaultPurpose: item.defaultPurpose,
    baseUnit: item.baseUnit,
    defaultInputUnit: item.defaultInputUnit,
    reportUnit: item.reportUnit,
    minQtyBase: item.minQtyBase ? String(item.minQtyBase) : null,
    synonyms: item.synonyms,
    note: item.note,
    analytics: {
      expenseArticleId: item.defaultExpenseArticle.id,
      purposeId: item.defaultPurpose.id,
    },
  };
}

export interface ItemLegacyWriteDraft {
  code?: string;
  name: string;
  categoryId: string;
  defaultExpenseArticleId: string;
  defaultPurposeId: string;
  baseUnitId: string;
  defaultInputUnitId: string;
  reportUnitId: string;
  minQtyBase?: number | null;
  synonyms?: string | null;
  note?: string | null;
  isActive?: boolean;
}

/**
 * Явный compatibility mapping в обратную сторону:
 * канонический draft в persistence-поля legacy `Item`.
 */
export function mapAccountingPositionDraftToItemDraft(draft: ItemLegacyWriteDraft): ItemLegacyWriteDraft {
  return {
    ...draft,
    synonyms: draft.synonyms ?? null,
    note: draft.note ?? null,
    minQtyBase: draft.minQtyBase ?? null,
    isActive: draft.isActive ?? true,
  };
}
