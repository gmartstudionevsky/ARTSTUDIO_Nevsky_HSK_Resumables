export type ImportIssue = {
  sheet: string;
  row: number;
  column: string;
  message: string;
};

export type DirectoryRow = {
  rowNumber: number;
  code: string;
  name: string;
  sectionCode: string;
  baseUnit: string;
  defaultInputUnit: string;
  reportUnit: string;
  minQtyBase: number | null;
  openingQty: number;
  expenseArticleCode: string;
  isActive: boolean;
  synonyms: string | null;
  note: string | null;
};

export type UnitRow = {
  rowNumber: number;
  accountingPositionCode: string;
  itemCode?: string;
  unitName: string;
  factorToBase: number;
  isAllowed: boolean;
  isDefaultInput: boolean;
  isDefaultReport: boolean;
};

export type ImportSummary = {
  accountingPositions: number;
  items?: number;
  categories: number;
  units: number;
  expenseArticles: number;
  sections: number;
  purposes?: number;
  accountingPositionUnits: number;
  itemUnits?: number;
  openingLines: number;
  syncMatched: number;
  syncCreated: number;
  syncSkipped: number;
  syncNeedsReview: number;
};

export type ImportSyncCandidate = {
  accountingPositionId: string;
  itemId?: string;
  code: string;
  name: string;
  category: string;
  score: number;
  reason: string;
};

export type ImportSyncAction = 'AUTO' | 'CREATE' | 'SKIP';

export type ImportSyncPlanRow = {
  rowNumber: number;
  sourceCode: string;
  sourceName: string;
  sourceCategory: string;
  sourceKey: string;
  status: 'MATCHED' | 'CREATE' | 'SKIP' | 'NEEDS_REVIEW';
  selectedAccountingPositionId: string | null;
  selectedItemId?: string | null;
  selectedReason: string | null;
  candidates: ImportSyncCandidate[];
  missingRequired: string[];
};

export type ImportSyncPlan = {
  mode: 'AUTO' | 'MANUAL';
  rows: ImportSyncPlanRow[];
};

export type NormalizedImportPayload = {
  summary: ImportSummary;
  errors: ImportIssue[];
  warnings: ImportIssue[];
  rows: {
    directory: DirectoryRow[];
    units: UnitRow[];
  };
  syncPlan: ImportSyncPlan;
};

export type CommitOptions = {
  createOpening?: boolean;
  syncMode?: 'AUTO' | 'MANUAL';
  unresolvedBehavior?: 'CREATE' | 'SKIP';
  decisions?: Array<{ rowNumber: number; action: ImportSyncAction; accountingPositionId?: string; itemId?: string }>;
};
