import { DistributionDraft, IntakeMode, ItemOption, OperationType, UnitOption } from '@/lib/operation/types';

export type ActionRowDraft = {
  qtyInput: string;
  unitId: string;
  expenseArticleId: string;
  purposeId: string;
  comment: string;
  expanded: boolean;
  loadingUnits: boolean;
  isSubmitting: boolean;
  error: string;
  distributions: DistributionDraft[];
};

export type ActionRowContext = {
  type: OperationType;
  intakeMode: IntakeMode;
  headerPurposeId: string;
  workspaceSectionId: string;
};

export function resolveDefaultPurposeId(item: ItemOption, context: ActionRowContext): string {
  if (context.type === 'IN' && context.intakeMode === 'SINGLE_PURPOSE' && context.headerPurposeId) {
    return context.headerPurposeId;
  }

  return item.defaultPurpose.id || context.workspaceSectionId;
}

export function buildInitialActionRowDraft(item: ItemOption, unitRows: UnitOption[], context: ActionRowContext): ActionRowDraft {
  const defaultUnitId = unitRows.find((unit) => unit.isDefaultInput)?.unitId ?? unitRows[0]?.unitId ?? '';

  return {
    qtyInput: '',
    unitId: defaultUnitId,
    expenseArticleId: item.defaultExpenseArticle.id,
    purposeId: resolveDefaultPurposeId(item, context),
    comment: '',
    expanded: false,
    loadingUnits: false,
    isSubmitting: false,
    error: '',
    distributions: [],
  };
}

export function hydrateActionRowDraftWithUnits(params: {
  currentDraft: ActionRowDraft | undefined;
  item: ItemOption;
  unitRows: UnitOption[];
  context: ActionRowContext;
}): ActionRowDraft {
  const { currentDraft, item, unitRows, context } = params;
  const fallback = buildInitialActionRowDraft(item, unitRows, context);

  if (!currentDraft) return fallback;

  return {
    ...currentDraft,
    qtyInput: currentDraft.qtyInput,
    unitId: currentDraft.unitId || fallback.unitId,
    expenseArticleId: currentDraft.expenseArticleId || fallback.expenseArticleId,
    purposeId: currentDraft.purposeId || fallback.purposeId,
    distributions: currentDraft.distributions ?? [],
    loadingUnits: false,
    error: '',
  };
}

export function isActionRowFilled(draft: ActionRowDraft): boolean {
  return draft.qtyInput.trim().length > 0;
}

export function pickParticipatingRowIds(rowDrafts: Record<string, ActionRowDraft>): string[] {
  return Object.entries(rowDrafts)
    .filter(([, draft]) => isActionRowFilled(draft))
    .map(([itemId]) => itemId);
}

export function validateActionRowDraft(draft: ActionRowDraft): string {
  if (Number(draft.qtyInput) <= 0) return 'Введите количество больше нуля';
  if (!draft.unitId) return 'Выберите единицу';
  return '';
}
