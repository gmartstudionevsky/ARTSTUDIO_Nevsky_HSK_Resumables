export type OperationType = 'IN' | 'OUT' | 'ADJUST';
export type IntakeMode = 'SINGLE_PURPOSE' | 'DISTRIBUTE_PURPOSES';

export interface LookupItem {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface ItemOption {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  defaultExpenseArticle: { id: string; code: string; name: string };
  defaultPurpose: { id: string; code: string; name: string };
}

export interface UnitOption {
  id: string;
  itemId: string;
  unitId: string;
  factorToBase: string;
  isAllowed: boolean;
  isDefaultInput: boolean;
  isDefaultReport: boolean;
  unit: { id: string; name: string; isActive: boolean };
}

export interface DistributionDraft {
  purposeId: string;
  qtyInput: string;
}

export interface BatchLineDraft {
  localId: string;
  itemId: string;
  itemLabel: string;
  qtyInput: string;
  unitId: string;
  unitName: string;
  expenseArticleId: string;
  expenseArticleLabel: string;
  purposeId: string;
  purposeLabel: string;
  comment: string;
  distributions?: DistributionDraft[];
}

export interface TxLineView {
  id: string;
  qtyInput: string;
  status: 'ACTIVE' | 'CANCELLED';
  comment: string | null;
  item: { id: string; code: string; name: string };
  unit: { id: string; name: string };
  expenseArticle: { id: string; code: string; name: string };
  purpose: { id: string; code: string; name: string };
}

export interface TxResult {
  transaction: { id: string; batchId: string; type: OperationType; occurredAt: string };
  lines: TxLineView[];
}

export interface CorrectLineResult {
  transaction: { id: string; batchId: string; type: OperationType; occurredAt: string };
  line: TxLineView;
  correctedFromLineId: string;
}
