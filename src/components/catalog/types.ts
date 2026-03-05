export type RefOption = { id: string; name: string; code?: string };

export type CatalogItem = {
  id: string;
  code: string;
  name: string;
  category: { name: string };
  defaultExpenseArticle: { code: string; name: string };
  defaultPurpose: { code: string; name: string };
  isActive: boolean;
};

export type ItemUnitRow = {
  unitId: string;
  factorToBase: number;
  isAllowed: boolean;
  isDefaultInput: boolean;
  isDefaultReport: boolean;
};
