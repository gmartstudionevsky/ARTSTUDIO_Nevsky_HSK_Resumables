import { DistributionDraft, IntakeMode, ItemOption, OperationType, UnitOption } from '@/lib/operation/types';

export type ActionRowDraft = {
  qtyInput: string;
  unitId: string;
  expenseArticleId: string;
  sectionId: string;
  comment: string;
  expanded: boolean;
  secondLayerExpanded: boolean;
  showEligibilityHint: boolean;
  showControlledParameters: boolean;
  loadingUnits: boolean;
  isSubmitting: boolean;
  error: string;
  distributions: DistributionDraft[];
};

export type ActionRowContext = {
  type: OperationType;
  intakeMode: IntakeMode;
  headerSectionId: string;
  workspaceSectionId: string;
};

export function resolveDefaultSectionId(item: ItemOption, context: ActionRowContext): string {
  if (context.type === 'IN' && context.intakeMode === 'SINGLE_SECTION' && context.headerSectionId) {
    return context.headerSectionId;
  }

  return item.defaultSection.id || context.workspaceSectionId;
}

export function buildInitialActionRowDraft(item: ItemOption, unitRows: UnitOption[], context: ActionRowContext): ActionRowDraft {
  const defaultUnitId = unitRows.find((unit) => unit.isDefaultInput)?.unitId ?? unitRows[0]?.unitId ?? '';

  return {
    qtyInput: '',
    unitId: defaultUnitId,
    expenseArticleId: item.defaultExpenseArticle.id,
    sectionId: resolveDefaultSectionId(item, context),
    comment: '',
    expanded: false,
    secondLayerExpanded: false,
    showEligibilityHint: false,
    showControlledParameters: false,
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
    sectionId: currentDraft.sectionId || fallback.sectionId,
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

export function getSecondLayerEligibilityHints(item: ItemOption): string[] {
  const hints: string[] = [];
  const analytics = item.analytics;

  if (!analytics) {
    hints.push('Расширенные аналитики не настроены для этой позиции, используется базовый режим строки.');
    return hints;
  }

  if (analytics.availability?.controlledParameters === 'disabled') {
    hints.push('Управляемые параметры для позиции отключены и не влияют на проведение.');
  }

  if (analytics.availability?.controlledParameters === 'optional' && (analytics.controlledParameters?.valuesCount ?? 0) === 0) {
    hints.push('Управляемые параметры опциональны: сейчас слой не участвует в расширенных метриках.');
  }

  if (analytics.projectionEligibility?.expandedMetrics === false) {
    hints.push('Расширенные метрики работают в reduced-eligibility режиме для этой позиции.');
  }

  return hints;
}

export function hasSecondLayerPayload(item: ItemOption): boolean {
  const analytics = item.analytics;
  if (!analytics) return false;

  return Boolean(
    analytics.expenseArticle ||
    analytics.section ||
    analytics.controlledParameters ||
    analytics.availability ||
    analytics.projectionEligibility,
  );
}
