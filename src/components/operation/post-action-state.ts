import { ActionRowDraft } from '@/components/operation/action-row-state';
import { TxLineView, TxResult } from '@/lib/operation/types';

export type PostActionState = {
  result: TxResult;
  participatingItemIds: string[];
  mode: 'single' | 'multi';
};

export function buildPostActionState(result: TxResult, participatingItemIds: string[]): PostActionState {
  return {
    result,
    participatingItemIds,
    mode: participatingItemIds.length > 1 ? 'multi' : 'single',
  };
}

export function canPrepareCorrection(line: TxLineView, rowDrafts: Record<string, ActionRowDraft>): boolean {
  return Boolean(rowDrafts[line.accountingPosition.id]);
}

export function buildCorrectionPatch(line: TxLineView): Partial<ActionRowDraft> {
  return {
    qtyInput: line.qtyInput,
    unitId: line.unit.id,
    expenseArticleId: line.expenseArticle.id,
    sectionId: line.section.id,
    comment: line.comment ?? '',
    expanded: true,
    secondLayerExpanded: true,
    showEligibilityHint: false,
    showControlledParameters: false,
    error: '',
  };
}
