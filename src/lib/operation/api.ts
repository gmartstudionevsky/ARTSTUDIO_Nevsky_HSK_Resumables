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

function buildAccountingPositionsQuery(params: { q?: string; sectionId?: string; limit?: number }): string {
  const search = new URLSearchParams({ active: 'true', limit: String(params.limit ?? 50) });
  if (params.q?.trim()) search.set('q', params.q.trim());
  if (params.sectionId) search.set('sectionId', params.sectionId);
  return search.toString();
}

export async function fetchMovementWorkspace(params: { sectionId?: string; q?: string; limit?: number }): Promise<ItemOption[]> {
  const payload = await httpGet<{ accountingPositions: ItemOption[] }>(`/api/accounting-positions?${buildAccountingPositionsQuery({ q: params.q, sectionId: params.sectionId, limit: params.limit })}`);
  return payload.accountingPositions;
}

export async function searchItems(q: string): Promise<ItemOption[]> {
  return fetchMovementWorkspace({ q, limit: 20 });
}

export async function fetchItemUnits(accountingPositionId: string): Promise<UnitOption[]> {
  const res = await fetch(`/api/accounting-positions/${accountingPositionId}/units`, { cache: 'no-store' });
  const payload = await parseResponse<{ units: UnitOption[] }>(res);
  return payload.units;
}

export async function createTransaction(payload: { type: OperationType; occurredAt?: string | null; note?: string; intakeMode?: IntakeMode; headerSectionId?: string; lines: Array<{ accountingPositionId: string; qtyInput: string | number; unitId: string; expenseArticleId?: string; sectionId?: string; comment?: string; sectionDistributions?: Array<{ sectionId: string; qtyInput: string | number }> }> }): Promise<TxResult> {
  return httpPost<TxResult>('/api/transactions', {
    ...payload,
    lines: payload.lines.map((line) => ({
      accountingPositionId: line.accountingPositionId,
      qtyInput: line.qtyInput,
      unitId: line.unitId,
      expenseArticleId: line.expenseArticleId,
      sectionId: line.sectionId,
      comment: line.comment,
      sectionDistributions: line.sectionDistributions,
    })),
  });
}

export async function rollbackMovement(id: string, payload: { reasonId?: string; note?: string }): Promise<{ ok: boolean; message: string }> {
  return httpPost<{ ok: boolean; message: string }>(`/api/transactions/${id}/rollback`, payload);
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
