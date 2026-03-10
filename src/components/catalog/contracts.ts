export interface CatalogFiltersState {
  q: string;
  categoryId: string;
  expenseArticleId: string;
  active: 'true' | 'false' | 'all';
}

export interface CatalogDetailsItem {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  categoryId: string;
  defaultExpenseArticleId: string;
  defaultSectionId: string;
  baseUnitId: string;
  defaultInputUnitId: string;
  reportUnitId: string;
  minQtyBase: string | null;
  synonyms: string | null;
  note: string | null;
}

export function extractCatalogDetailsItem(payload: unknown): CatalogDetailsItem | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as { accountingPosition?: Partial<CatalogDetailsItem>; item?: Partial<CatalogDetailsItem> };
  const candidate = data.accountingPosition ?? data.item;
  if (!candidate) return null;

  const requiredKeys: Array<keyof CatalogDetailsItem> = [
    'id', 'code', 'name', 'isActive', 'categoryId', 'defaultExpenseArticleId', 'defaultSectionId', 'baseUnitId', 'defaultInputUnitId', 'reportUnitId',
  ];
  const hasRequired = requiredKeys.every((key) => key in candidate);
  if (!hasRequired) return null;

  return {
    id: String(candidate.id),
    code: String(candidate.code),
    name: String(candidate.name),
    isActive: Boolean(candidate.isActive),
    categoryId: String(candidate.categoryId),
    defaultExpenseArticleId: String(candidate.defaultExpenseArticleId),
    defaultSectionId: String(candidate.defaultSectionId),
    baseUnitId: String(candidate.baseUnitId),
    defaultInputUnitId: String(candidate.defaultInputUnitId),
    reportUnitId: String(candidate.reportUnitId),
    minQtyBase: candidate.minQtyBase == null ? null : String(candidate.minQtyBase),
    synonyms: candidate.synonyms == null ? null : String(candidate.synonyms),
    note: candidate.note == null ? null : String(candidate.note),
  };
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
