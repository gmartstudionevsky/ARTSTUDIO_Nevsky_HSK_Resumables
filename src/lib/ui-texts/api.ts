import { UiTextsResponse } from '@/lib/ui-texts/types';

async function handle<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? 'Ошибка запроса');
  }
  return payload as T;
}

export async function fetchUiTexts(query?: { q?: string; limit?: number; offset?: number }): Promise<UiTextsResponse> {
  const params = new URLSearchParams();
  if (query?.q) params.set('q', query.q);
  if (query?.limit !== undefined) params.set('limit', String(query.limit));
  if (query?.offset !== undefined) params.set('offset', String(query.offset));

  const response = await fetch(`/api/ui-texts?${params.toString()}`, { cache: 'no-store' });
  return handle<UiTextsResponse>(response);
}

export async function fetchAdminUiTexts(query: {
  q?: string;
  scope?: 'all' | 'BOTH' | 'WEB' | 'MOBILE';
  limit?: number;
  offset?: number;
}): Promise<UiTextsResponse> {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.scope) params.set('scope', query.scope);
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.offset !== undefined) params.set('offset', String(query.offset));

  const response = await fetch(`/api/admin/ui-texts?${params.toString()}`, { cache: 'no-store' });
  return handle<UiTextsResponse>(response);
}
