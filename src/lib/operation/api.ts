import { CorrectLineResult, IntakeMode, ItemOption, LookupItem, OperationType, PoliciesResponse, TxResult, UnitOption } from '@/lib/operation/types';
import { httpGet, httpPost, parseResponse } from '@/lib/http/client';

const lookupCache = new Map<string, LookupItem[]>();

export async function fetchLookup(type: 'expense-articles' | 'purposes' | 'reasons'): Promise<LookupItem[]> {
  const cached = lookupCache.get(type);
  if (cached) return cached;
  const payload = await httpGet<{ items: LookupItem[] }>(`/api/lookup/${type}?active=true`);
  lookupCache.set(type, payload.items);
  return payload.items;
}

function buildItemsQuery(params: { q?: string; purposeId?: string; limit?: number }): string {
  const search = new URLSearchParams({ active: 'true', limit: String(params.limit ?? 50) });
  if (params.q?.trim()) search.set('q', params.q.trim());
  if (params.purposeId) search.set('purposeId', params.purposeId);
  return search.toString();
}

export async function fetchMovementWorkspace(params: { sectionId?: string; q?: string; limit?: number }): Promise<ItemOption[]> {
  const payload = await httpGet<{ items: ItemOption[] }>(`/api/items?${buildItemsQuery({ q: params.q, purposeId: params.sectionId, limit: params.limit })}`);
  return payload.items;
}

export async function searchItems(q: string): Promise<ItemOption[]> {
  return fetchMovementWorkspace({ q, limit: 20 });
}

export async function fetchItemUnits(itemId: string): Promise<UnitOption[]> {
  const res = await fetch(`/api/items/${itemId}/units`, { cache: 'no-store' });
  const payload = await parseResponse<{ units: UnitOption[] }>(res);
  return payload.units;
}

export async function createTransaction(payload: { type: OperationType; occurredAt?: string | null; note?: string; intakeMode?: IntakeMode; headerPurposeId?: string; lines: Array<{ itemId: string; qtyInput: string | number; unitId: string; expenseArticleId?: string; purposeId?: string; comment?: string; distributions?: Array<{ purposeId: string; qtyInput: string | number }> }> }): Promise<TxResult> {
  return httpPost<TxResult>('/api/transactions', payload);
}

export async function cancelTransaction(id: string, payload: { reasonId?: string; cancelNote?: string }): Promise<{ ok: boolean }> {
  return httpPost<{ ok: boolean }>(`/api/transactions/${id}/cancel`, payload);
}

export async function cancelLine(id: string, payload: { reasonId?: string; cancelNote?: string }): Promise<{ ok: boolean }> {
  return httpPost<{ ok: boolean }>(`/api/transaction-lines/${id}/cancel`, payload);
}

export async function correctLine(id: string, payload: Record<string, unknown>): Promise<CorrectLineResult> {
  return httpPost<CorrectLineResult>(`/api/transaction-lines/${id}/correct`, payload);
}

export async function fetchPolicies(): Promise<PoliciesResponse['policies']> {
  const payload = await httpGet<PoliciesResponse>('/api/settings');
  return payload.policies;
}
