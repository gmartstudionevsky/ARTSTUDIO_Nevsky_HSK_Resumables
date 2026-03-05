import { StockItemSnapshot } from '@/lib/stock/types';

export interface ItemDetailsResponse {
  item: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    category: { id: string; name: string };
    defaultExpenseArticle: { id: string; code: string; name: string };
    defaultPurpose: { id: string; code: string; name: string };
    baseUnit: { id: string; name: string };
    defaultInputUnit: { id: string; name: string };
    reportUnit: { id: string; name: string };
    minQtyBase: string | null;
    synonyms: string | null;
    note: string | null;
  };
}

export interface ItemMovement {
  lineId: string;
  occurredAt: string;
  tx: { id: string; batchId: string; type: 'IN' | 'OUT' | 'ADJUST' | 'OPENING' | 'INVENTORY_APPLY' };
  qtyInput: string;
  unit: { id: string; name: string };
  qtyBase: string;
  expenseArticle: { id: string; code: string; name: string };
  purpose: { id: string; code: string; name: string };
  status: 'ACTIVE' | 'CANCELLED';
}

export interface ItemMovementsResponse {
  items: ItemMovement[];
}

export interface ItemPageData {
  item: ItemDetailsResponse['item'];
  stock: StockItemSnapshot;
  movements: ItemMovement[];
}
