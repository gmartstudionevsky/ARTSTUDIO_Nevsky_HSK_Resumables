import { HistoryListResponse, HistoryQuery, HistoryTransactionDetail, RefOption } from '@/lib/history/types';

async function handle<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error ?? 'Ошибка запроса');
  return payload as T;
}

export async function fetchHistoryList(query: HistoryQuery): Promise<HistoryListResponse> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    params.set(key, String(value));
  });
  const res = await fetch(`/api/transactions?${params.toString()}`, { cache: 'no-store' });
  return handle<HistoryListResponse>(res);
}

export async function fetchHistoryDetail(id: string): Promise<HistoryTransactionDetail> {
  const res = await fetch(`/api/transactions/${id}`, { cache: 'no-store' });
  return handle<HistoryTransactionDetail>(res);
}

export async function fetchLookup(type: 'expense-articles' | 'purposes' | 'reasons'): Promise<RefOption[]> {
  const res = await fetch(`/api/lookup/${type}?active=true`, { cache: 'no-store' });
  const payload = await handle<{ items: RefOption[] }>(res);
  return payload.items;
}

export async function searchItems(q: string): Promise<Array<{ id: string; code: string; name: string }>> {
  const params = new URLSearchParams({ q, limit: '20', active: 'true' });
  const res = await fetch(`/api/items?${params.toString()}`, { cache: 'no-store' });
  const payload = await handle<{ items: Array<{ id: string; code: string; name: string }> }>(res);
  return payload.items;
}

export async function fetchItemUnits(itemId: string): Promise<Array<{ id: string; unitId: string; unit: { id: string; name: string } }>> {
  const res = await fetch(`/api/items/${itemId}/units`, { cache: 'no-store' });
  const payload = await handle<{ units: Array<{ id: string; unitId: string; unit: { id: string; name: string } }> }>(res);
  return payload.units;
}
