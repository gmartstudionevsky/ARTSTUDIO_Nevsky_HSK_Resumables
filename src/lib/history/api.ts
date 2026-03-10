import { httpGet, parseResponse } from '@/lib/http/client';
import { HistoryListResponse, HistoryQuery, HistoryTransactionDetail, RefOption } from '@/lib/history/types';

const lookupCache = new Map<string, RefOption[]>();

export async function fetchHistoryList(query: HistoryQuery): Promise<HistoryListResponse> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    params.set(key, String(value));
  });
  return httpGet<HistoryListResponse>(`/api/transactions?${params.toString()}`);
}

export async function fetchHistoryDetail(id: string): Promise<HistoryTransactionDetail> {
  return httpGet<HistoryTransactionDetail>(`/api/transactions/${id}`);
}

export async function fetchLookup(type: 'expense-articles' | 'categories' | 'sections' | 'purposes' | 'reasons'): Promise<RefOption[]> {
  const routeType = type === 'purposes' ? 'sections' : type;
  const cached = lookupCache.get(routeType);
  if (cached) return cached;
  const payload = await httpGet<{ items: Array<{ id: string; code?: string; name: string }> }>(`/api/lookup/${routeType}?active=true`);
  const items = payload.items.map((item) => ({ ...item, code: item.code ?? item.name }));
  lookupCache.set(routeType, items);
  return items;
}

export async function searchItems(q: string): Promise<Array<{ id: string; code: string; name: string }>> {
  const params = new URLSearchParams({ q, limit: '20', active: 'true' });
  const payload = await httpGet<{ accountingPositions?: Array<{ id: string; code: string; name: string }>; items?: Array<{ id: string; code: string; name: string }> }>(`/api/accounting-positions?${params.toString()}`);
  return payload.accountingPositions ?? payload.items ?? [];
}

export async function fetchItemUnits(itemId: string): Promise<Array<{ id: string; unitId: string; unit: { id: string; name: string } }>> {
  const response = await fetch(`/api/accounting-positions/${itemId}/units`, { cache: 'no-store' });
  const payload = await parseResponse<{ units: Array<{ id: string; unitId: string; unit: { id: string; name: string } }> }>(response);
  return payload.units;
}
