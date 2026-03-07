export type AccountingPositionId = string;

export interface AccountingPositionDirectoryLink {
  id: string;
  code?: string;
  name: string;
}

/**
 * Каноническая сущность предметного ядра R2.1.
 *
 * В persistence-слое она хранится в модели `Item` (legacy naming),
 * но в domain/application слое используется как «Позиция учёта».
 */
export interface AccountingPosition {
  id: AccountingPositionId;
  code: string;
  name: string;
  isActive: boolean;

  category: AccountingPositionDirectoryLink;
  defaultExpenseArticle: AccountingPositionDirectoryLink;
  defaultPurpose: AccountingPositionDirectoryLink;

  baseUnit: AccountingPositionDirectoryLink;
  defaultInputUnit: AccountingPositionDirectoryLink;
  reportUnit: AccountingPositionDirectoryLink;

  minQtyBase: string | null;
  synonyms: string | null;
  note: string | null;

  /**
   * Extension-point под R2.2/R2.3:
   * аналитические оси (статья затрат/раздел/управляемые параметры)
   * будут обогащать этот блок без пересборки persistence-схемы.
   */
  analytics: {
    expenseArticleId: string;
    purposeId: string;
  };
}
