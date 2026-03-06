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

export async function fetchLookup(type: 'expense-articles' | 'purposes' | 'reasons'): Promise<RefOption[]> {
  const cached = lookupCache.get(type);
  if (cached) return cached;
  const payload = await httpGet<{ items: RefOption[] }>(`/api/lookup/${type}?active=true`);
  lookupCache.set(type, payload.items);
  return payload.items;
}

export async function fetchCategoriesLookup(): Promise<Array<{ id: string; name: string }>> {
  const response = await fetch('/api/lookup/categories?active=true', { cache: 'no-store' });
  const payload = await parseResponse<{ items: Array<{ id: string; name: string }> }>(response);
  return payload.items;
}

export async function searchItems(q: string): Promise<Array<{ id: string; code: string; name: string }>> {
  const params = new URLSearchParams({ q, limit: '20', active: 'true' });
  const payload = await httpGet<{ items: Array<{ id: string; code: string; name: string }> }>(`/api/items?${params.toString()}`);
  return payload.items;
}

export async function fetchItemUnits(itemId: string): Promise<Array<{ id: string; unitId: string; unit: { id: string; name: string } }>> {
  const response = await fetch(`/api/items/${itemId}/units`, { cache: 'no-store' });
  const payload = await parseResponse<{ units: Array<{ id: string; unitId: string; unit: { id: string; name: string } }> }>(response);
  return payload.units;
}

export async function fetchUsersLookup(): Promise<Array<{ id: string; login: string; role: string; isActive: boolean }>> {
  const payload = await httpGet<{ items: Array<{ id: string; login: string; role: string; isActive: boolean }> }>('/api/lookup/users?active=all');
  return payload.items;
}
