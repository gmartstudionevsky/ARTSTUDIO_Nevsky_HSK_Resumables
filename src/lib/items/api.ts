import { ItemDetailsResponse, ItemMovementsResponse } from '@/lib/items/types';

async function handle<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error ?? 'Ошибка запроса');
  return payload as T;
}

export async function fetchItemDetails(itemId: string): Promise<ItemDetailsResponse> {
  const response = await fetch(`/api/items/${itemId}`, { cache: 'no-store' });
  return handle<ItemDetailsResponse>(response);
}

export async function fetchItemMovements(itemId: string, limit = 20): Promise<ItemMovementsResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(`/api/items/${itemId}/movements?${params.toString()}`, { cache: 'no-store' });
  return handle<ItemMovementsResponse>(response);
}
