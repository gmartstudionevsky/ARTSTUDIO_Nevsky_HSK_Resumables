import { AccountingPosition } from '@/lib/domain/accounting-position/types';

/**
 * Канонический read-side реестр позиции учёта (R2.1).
 * В transport может отдаваться параллельно с legacy ключом `items`.
 */
export interface PositionCatalogEntry {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  category: { id: string; name: string };
  defaultExpenseArticle: { id: string; code: string; name: string };
  defaultPurpose: { id: string; code: string; name: string };
}

export interface PositionCatalog {
  entries: PositionCatalogEntry[];
  total: number;
}

export function toPositionCatalogEntry(position: AccountingPosition): PositionCatalogEntry {
  return {
    id: position.id,
    code: position.code,
    name: position.name,
    isActive: position.isActive,
    category: { id: position.category.id, name: position.category.name },
    defaultExpenseArticle: {
      id: position.defaultExpenseArticle.id,
      code: position.defaultExpenseArticle.code ?? '',
      name: position.defaultExpenseArticle.name,
    },
    defaultPurpose: {
      id: position.defaultPurpose.id,
      code: position.defaultPurpose.code ?? '',
      name: position.defaultPurpose.name,
    },
  };
}
