import { httpGet } from '@/lib/http/client';
import { StockListQuery, StockListResponse } from '@/lib/stock/types';

export async function fetchStockList(query: StockListQuery): Promise<StockListResponse> {
  const params = new URLSearchParams();

  if (query.q) params.set('q', query.q);
  if (query.categoryId) params.set('categoryId', query.categoryId);
  if (query.expenseArticleId) params.set('expenseArticleId', query.expenseArticleId);
  if (query.sectionId) params.set('sectionId', query.sectionId);
  if (query.status) params.set('status', query.status);
  if (query.active) params.set('active', query.active);
  params.set('limit', String(query.limit ?? 50));
  params.set('offset', String(query.offset ?? 0));

  return httpGet<StockListResponse>(`/api/stock?${params.toString()}`);
}
