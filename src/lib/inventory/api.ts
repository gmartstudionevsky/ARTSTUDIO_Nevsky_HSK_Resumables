import { InventoryDetailResponse, InventoryFillScope, InventoryListQuery, InventoryListResponse, InventoryMode } from '@/lib/inventory/types';

async function handle<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error ?? 'Ошибка запроса');
  return payload as T;
}

export async function fetchInventoryList(query: InventoryListQuery): Promise<InventoryListResponse> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    params.set(key, String(value));
  });
  const response = await fetch(`/api/inventory?${params.toString()}`, { cache: 'no-store' });
  return handle<InventoryListResponse>(response);
}

export async function createInventory(payload: { occurredAt: string; note?: string | null; mode?: InventoryMode }): Promise<{ session: { id: string } }> {
  const response = await fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return handle<{ session: { id: string } }>(response);
}

export async function fetchInventoryDetail(id: string): Promise<InventoryDetailResponse> {
  const response = await fetch(`/api/inventory/${id}`, { cache: 'no-store' });
  return handle<InventoryDetailResponse>(response);
}

export async function fillInventoryLines(id: string, payload: { scope: InventoryFillScope; categoryId?: string; itemIds?: string[] }): Promise<{ ok: true; count: number }> {
  const response = await fetch(`/api/inventory/${id}/fill`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return handle<{ ok: true; count: number }>(response);
}

export async function patchInventoryLines(id: string, updates: Array<{ lineId: string; qtyFactInput?: string | number | null; unitId?: string | null; apply?: boolean; comment?: string | null }>): Promise<{ ok: true }> {
  const response = await fetch(`/api/inventory/${id}/lines`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates }) });
  return handle<{ ok: true }>(response);
}

export async function applyInventory(id: string, payload: { reasonId?: string | null; note?: string | null }): Promise<{ ok: true; transactionId: string; transactionType: 'OPENING' | 'INVENTORY_APPLY'; appliedLines: number }> {
  const response = await fetch(`/api/inventory/${id}/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return handle<{ ok: true; transactionId: string; transactionType: 'OPENING' | 'INVENTORY_APPLY'; appliedLines: number }>(response);
}

export async function searchItems(q: string): Promise<Array<{ id: string; code: string; name: string }>> {
  const params = new URLSearchParams({ q, limit: '20', active: 'true' });
  const res = await fetch(`/api/items?${params.toString()}`, { cache: 'no-store' });
  const payload = await handle<{ items: Array<{ id: string; code: string; name: string }> }>(res);
  return payload.items;
}
