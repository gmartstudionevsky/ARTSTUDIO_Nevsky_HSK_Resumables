export type SavedFilterKind = 'HISTORY' | 'STOCK';

export interface SavedFilterItem {
  id: string;
  name: string;
  isDefault: boolean;
  payload: Record<string, unknown>;
  updatedAt: string;
}

export interface SavedFilterListResponse {
  items: SavedFilterItem[];
  total: number;
}

export interface HistorySavedFilterPayload {
  from?: string;
  to?: string;
  type?: 'all' | 'IN' | 'OUT' | 'ADJUST' | 'OPENING' | 'INVENTORY_APPLY';
  status?: 'all' | 'active' | 'cancelled';
  q?: string;
  itemId?: string;
  expenseArticleId?: string;
  purposeId?: string;
  createdById?: string;
  categoryId?: string;
}

export interface StockSavedFilterPayload {
  q?: string;
  categoryId?: string;
  expenseArticleId?: string;
  purposeId?: string;
  status?: 'all' | 'ok' | 'belowMin' | 'zero';
  active?: 'true' | 'false' | 'all';
}
