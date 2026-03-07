/**
 * Справочники — отдельный слой классификационных/управляющих сущностей.
 * На R2.1 фиксируем минимальные контракты и связь с legacy persistence-моделями.
 */
export type DirectoryCodeName = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type DirectoryNameOnly = {
  id: string;
  name: string;
  isActive: boolean;
};

export interface DirectoriesRegistry {
  categories: DirectoryNameOnly[];
  units: DirectoryNameOnly[];
  expenseArticles: DirectoryCodeName[];
  purposes: DirectoryCodeName[];
  reasons: DirectoryCodeName[];
}

/**
 * Mapping legacy API-параметров справочников в канонические имена слоя `Справочники`.
 */
export const LEGACY_DICTIONARY_TYPE_MAP = {
  categories: 'categories',
  units: 'units',
  'expense-articles': 'expenseArticles',
  purposes: 'purposes',
  reasons: 'reasons',
} as const;
