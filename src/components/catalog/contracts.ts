export interface CatalogFiltersState {
  q: string;
  categoryId: string;
  expenseArticleId: string;
  active: 'true' | 'false' | 'all';
}

export function buildCatalogListQuery(filters: CatalogFiltersState): string {
  const params = new URLSearchParams({
    active: filters.active,
    limit: '100',
    offset: '0',
  });

  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.expenseArticleId) params.set('expenseArticleId', filters.expenseArticleId);

  return params.toString();
}

export function extractCreatedAccountingPosition(payload: unknown): { id: string; transactionId?: string } | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as { accountingPosition?: { id?: string }; transactionId?: string };
  const id = data.accountingPosition?.id;
  if (typeof id !== 'string' || !id) return null;
  return {
    id,
    transactionId: typeof data.transactionId === 'string' ? data.transactionId : undefined,
  };
}

