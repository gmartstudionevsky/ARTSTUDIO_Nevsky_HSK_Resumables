import {
  assertAccountingPositionInvariants,
  evaluateAccountingPositionInvariants,
  type AccountingPositionInvariantResult,
} from '@/lib/domain/accounting-position/invariants';
import { AccountingAxisMode, AccountingPosition } from '@/lib/domain/accounting-position/types';

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

export interface AccountingAnalyticsAvailabilityDraft {
  expenseArticle?: AccountingAxisMode;
  section?: AccountingAxisMode;
  controlledParameters?: AccountingAxisMode;
}

export interface AccountingPositionMapOptions {
  availability?: AccountingAnalyticsAvailabilityDraft;
  strict?: boolean;
}

function resolveAvailabilityModes(options?: AccountingPositionMapOptions): Required<AccountingAnalyticsAvailabilityDraft> {
  return {
    expenseArticle: options?.availability?.expenseArticle ?? 'required',
    section: options?.availability?.section ?? 'required',
    controlledParameters: options?.availability?.controlledParameters ?? 'disabled',
  };
}

export function mapItemRecordToAccountingPosition(
  item: ItemLegacyRecord,
  options?: AccountingPositionMapOptions,
): AccountingPosition {
  const availability = resolveAvailabilityModes(options);

  const position: AccountingPosition = {
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
      expenseArticle:
        availability.expenseArticle === 'disabled'
          ? null
          : {
              id: item.defaultExpenseArticle.id,
              code: item.defaultExpenseArticle.code,
              name: item.defaultExpenseArticle.name,
              workspaceNaming: {
                level1: null,
                level2: null,
              },
              source: 'legacy.defaultExpenseArticle',
            },
      section:
        availability.section === 'disabled'
          ? null
          : {
              id: item.defaultPurpose.id,
              code: item.defaultPurpose.code,
              name: item.defaultPurpose.name,
              source: 'legacy.defaultPurpose',
            },
      controlledParameters: {
        mode: availability.controlledParameters,
        values: [],
      },
      availability,
      compatibility: {
        expenseArticleId: availability.expenseArticle === 'disabled' ? null : item.defaultExpenseArticle.id,
        purposeId: availability.section === 'disabled' ? null : item.defaultPurpose.id,
      },
    },
  };

  if (options?.strict ?? true) {
    assertAccountingPositionInvariants(position);
  }

  return position;
}

export function mapItemRecordToAccountingPositionWithValidation(
  item: ItemLegacyRecord,
  options?: AccountingPositionMapOptions,
): { position: AccountingPosition; invariants: AccountingPositionInvariantResult } {
  const position = mapItemRecordToAccountingPosition(item, { ...options, strict: false });
  return {
    position,
    invariants: evaluateAccountingPositionInvariants(position),
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
