import { StockListQuery, StockListResponse } from '@/lib/stock/types';

async function handle<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error ?? 'Ошибка запроса');
  return payload as T;
}

export async function fetchStockList(query: StockListQuery): Promise<StockListResponse> {
  const params = new URLSearchParams();

  if (query.q) params.set('q', query.q);
  if (query.categoryId) params.set('categoryId', query.categoryId);
  if (query.expenseArticleId) params.set('expenseArticleId', query.expenseArticleId);
  if (query.purposeId) params.set('purposeId', query.purposeId);
  if (query.status) params.set('status', query.status);
  if (query.active) params.set('active', query.active);
  params.set('limit', String(query.limit ?? 50));
  params.set('offset', String(query.offset ?? 0));

  const response = await fetch(`/api/stock?${params.toString()}`, { cache: 'no-store' });
  return handle<StockListResponse>(response);
}
