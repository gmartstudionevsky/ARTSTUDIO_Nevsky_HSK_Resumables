export type HistoryTxType = 'IN' | 'OUT' | 'ADJUST' | 'OPENING' | 'INVENTORY_APPLY';
export type HistoryBatchStatusFilter = 'active' | 'cancelled' | 'all';
export type HistoryBatchStatus = 'ACTIVE' | 'PARTIAL' | 'CANCELLED';

export interface HistoryListItem {
  id: string;
  batchId: string;
  type: HistoryTxType;
  occurredAt: string;
  createdAt: string;
  createdBy: { id: string; login: string };
  note: string | null;
  status: 'ACTIVE' | 'CANCELLED';
  linesTotal: number;
  linesActive: number;
  linesCancelled: number;
  uiStatus: HistoryBatchStatus;
}

export interface HistoryListResponse {
  items: HistoryListItem[];
  total: number;
}

export interface HistoryQuery {
  from?: string;
  to?: string;
  type?: HistoryTxType | 'all';
  status?: HistoryBatchStatusFilter;
  q?: string;
  itemId?: string;
  expenseArticleId?: string;
  purposeId?: string;
  limit?: number;
  offset?: number;
}

export interface HistoryLine {
  id: string;
  item: { id: string; code: string; name: string };
  qtyInput: string;
  unit: { id: string; name: string };
  qtyBase: string;
  expenseArticle: { id: string; code: string; name: string };
  purpose: { id: string; code: string; name: string };
  comment: string | null;
  status: 'ACTIVE' | 'CANCELLED';
  cancelledAt: string | null;
  cancelNote: string | null;
  cancelledBy?: { id: string; login: string } | null;
  reason?: { id: string; code: string; name: string } | null;
  correctedFromLineId: string | null;
}

export interface HistoryTransactionDetail {
  transaction: {
    id: string;
    batchId: string;
    type: HistoryTxType;
    occurredAt: string;
    createdAt: string;
    note: string | null;
    status: 'ACTIVE' | 'CANCELLED';
    cancelledAt: string | null;
    cancelNote: string | null;
    cancelledBy?: { id: string; login: string } | null;
    reason?: { id: string; code: string; name: string } | null;
    createdBy: { id: string; login: string };
  };
  lines: HistoryLine[];
  uiStatus: HistoryBatchStatus;
}

export interface RefOption {
  id: string;
  code: string;
  name: string;
}
