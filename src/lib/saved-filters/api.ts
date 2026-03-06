import { httpGet, parseResponse } from '@/lib/http/client';
import { SavedFilterItem, SavedFilterKind, SavedFilterListResponse } from '@/lib/saved-filters/types';

export async function fetchSavedFilters(kind: SavedFilterKind): Promise<SavedFilterListResponse> {
  return httpGet<SavedFilterListResponse>(`/api/saved-filters?kind=${kind.toLowerCase()}`);
}

export async function createSavedFilter(input: { kind: SavedFilterKind; name: string; payload: Record<string, unknown>; isDefault?: boolean }): Promise<{ item: SavedFilterItem }> {
  const response = await fetch('/api/saved-filters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  return parseResponse<{ item: SavedFilterItem }>(response);
}

export async function updateSavedFilter(id: string, input: { name?: string; payload?: Record<string, unknown>; isDefault?: boolean }): Promise<{ item: SavedFilterItem }> {
  const response = await fetch(`/api/saved-filters/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  return parseResponse<{ item: SavedFilterItem }>(response);
}

export async function deleteSavedFilter(id: string): Promise<{ ok: true }> {
  const response = await fetch(`/api/saved-filters/${id}`, { method: 'DELETE' });
  return parseResponse<{ ok: true }>(response);
}

export function serializeHistoryFilters(filters: Record<string, string>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (!value) return;
    payload[key] = value;
  });
  return payload;
}

export function serializeStockFilters(filters: Record<string, string>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  ['q', 'categoryId', 'expenseArticleId', 'purposeId', 'status', 'active'].forEach((key) => {
    const value = filters[key];
    if (!value) return;
    payload[key] = value;
  });
  return payload;
}
