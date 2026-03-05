export type StockStatus = 'OK' | 'BELOW_MIN' | 'ZERO';

export type StockStatusFilter = 'ok' | 'belowMin' | 'zero' | 'all';
export type ActiveFilter = 'true' | 'false' | 'all';

export interface StockListQuery {
  q?: string;
  categoryId?: string;
  expenseArticleId?: string;
  purposeId?: string;
  status?: StockStatusFilter;
  active?: ActiveFilter;
  limit?: number;
  offset?: number;
}

export interface StockListItem {
  itemId: string;
  code: string;
  name: string;
  category: { id: string; name: string };
  defaultExpenseArticle: { id: string; code: string; name: string };
  defaultPurpose: { id: string; code: string; name: string };
  reportUnit: { id: string; name: string };
  qtyBase: string;
  qtyReport: string;
  minQtyBase: string | null;
  status: StockStatus;
  isNegative: boolean;
  isActive: boolean;
  dataWarning?: 'REPORT_FACTOR_FALLBACK';
}

export interface StockListResponse {
  items: StockListItem[];
  total: number;
}

export interface StockItemSnapshot {
  qtyBase: string;
  qtyReport: string;
  minQtyBase: string | null;
  reportFactorToBase: string;
  status: StockStatus;
  isNegative: boolean;
  dataWarning?: 'REPORT_FACTOR_FALLBACK';
}
