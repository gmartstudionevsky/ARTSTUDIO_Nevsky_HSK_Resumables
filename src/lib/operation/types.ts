export type OperationType = 'IN' | 'OUT' | 'ADJUST';
export type IntakeMode = 'SINGLE_SECTION' | 'DISTRIBUTE_SECTIONS';

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
  defaultSection: { id: string; code: string; name: string };
  defaultPurpose?: { id: string; code: string; name: string };
  analytics?: {
    expenseArticle?: { id: string; code?: string; name: string } | null;
    section?: { id: string; code?: string; name: string } | null;
    controlledParameters?: { mode: 'required' | 'optional' | 'disabled'; valuesCount: number };
    availability?: {
      expenseArticle: 'required' | 'optional' | 'disabled';
      section: 'required' | 'optional' | 'disabled';
      controlledParameters: 'required' | 'optional' | 'disabled';
    };
    projectionEligibility?: {
      expandedMetrics: boolean;
      reasons: string[];
    };
  };
}

export interface UnitOption {
  id: string;
  accountingPositionId: string;
  itemId?: string;
  unitId: string;
  factorToBase: string;
  isAllowed: boolean;
  isDefaultInput: boolean;
  isDefaultReport: boolean;
  unit: { id: string; name: string; isActive: boolean };
}

export interface DistributionDraft {
  sectionId: string;
  purposeId?: string;
  qtyInput: string;
}

export interface BatchLineDraft {
  localId: string;
  accountingPositionId: string;
  itemId?: string;
  accountingPositionLabel: string;
  itemLabel?: string;
  qtyInput: string;
  unitId: string;
  unitName: string;
  expenseArticleId: string;
  expenseArticleLabel: string;
  sectionId: string;
  purposeId?: string;
  sectionLabel: string;
  purposeLabel?: string;
  comment: string;
  distributions?: DistributionDraft[];
}

export interface TxLineView {
  id: string;
  qtyInput: string;
  status: 'ACTIVE' | 'CANCELLED';
  comment: string | null;
  accountingPosition: { id: string; code: string; name: string };
  item?: { id: string; code: string; name: string };
  unit: { id: string; name: string };
  expenseArticle: { id: string; code: string; name: string };
  section: { id: string; code: string; name: string };
  purpose?: { id: string; code: string; name: string };
}

export interface TxResult {
  transaction: { id: string; batchId: string; type: OperationType; occurredAt: string };
  lines: TxLineView[];
  recovery?: {
    eventContextId?: string;
    causalChain?: string[];
    correlationId?: string | null;
  };
  warnings?: Array<{ code: 'NEGATIVE_STOCK'; message: string; accountingPositionId: string; accountingPositionName: string; itemId?: string; itemName?: string }>;
}

export type PoliciesResponse = {
  policies: {
    supervisorBackdateDays: number;
    requireReasonOnCancel: boolean;
    allowNegativeStock: boolean;
    displayDecimals: number;
    enablePeriodLocks: boolean;
  };
};

export interface CorrectLineResult {
  transaction: { id: string; batchId: string; type: OperationType; occurredAt: string };
  line: TxLineView;
  correctedFromLineId: string;
}
