import { CorrectLineResult, IntakeMode, ItemOption, LookupItem, OperationType, TxResult, UnitOption } from '@/lib/operation/types';

async function handle<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error ?? 'Ошибка запроса');
  return payload as T;
}

export async function fetchLookup(type: 'expense-articles' | 'purposes' | 'reasons'): Promise<LookupItem[]> {
  const res = await fetch(`/api/lookup/${type}?active=true`, { cache: 'no-store' });
  const payload = await handle<{ items: LookupItem[] }>(res);
  return payload.items;
}

export async function searchItems(q: string): Promise<ItemOption[]> {
  const params = new URLSearchParams({ q, limit: '20', active: 'true' });
  const res = await fetch(`/api/items?${params.toString()}`, { cache: 'no-store' });
  const payload = await handle<{ items: ItemOption[] }>(res);
  return payload.items;
}

export async function fetchItemUnits(itemId: string): Promise<UnitOption[]> {
  const res = await fetch(`/api/items/${itemId}/units`, { cache: 'no-store' });
  const payload = await handle<{ units: UnitOption[] }>(res);
  return payload.units;
}

export async function createTransaction(payload: { type: OperationType; occurredAt?: string | null; note?: string; intakeMode?: IntakeMode; headerPurposeId?: string; lines: Array<{ itemId: string; qtyInput: string | number; unitId: string; expenseArticleId?: string; purposeId?: string; comment?: string; distributions?: Array<{ purposeId: string; qtyInput: string | number }> }> }): Promise<TxResult> {
  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handle<TxResult>(res);
}

export async function cancelTransaction(id: string, payload: { reasonId?: string; cancelNote?: string }): Promise<{ ok: boolean }> {
  const res = await fetch(`/api/transactions/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handle<{ ok: boolean }>(res);
}

export async function cancelLine(id: string, payload: { reasonId?: string; cancelNote?: string }): Promise<{ ok: boolean }> {
  const res = await fetch(`/api/transaction-lines/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handle<{ ok: boolean }>(res);
}

export async function correctLine(id: string, payload: Record<string, unknown>): Promise<CorrectLineResult> {
  const res = await fetch(`/api/transaction-lines/${id}/correct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handle<CorrectLineResult>(res);
}
