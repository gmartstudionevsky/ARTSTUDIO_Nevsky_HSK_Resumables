export type UiTextScope = 'BOTH' | 'WEB' | 'MOBILE';

export type UiTextItem = {
  id: string;
  key: string;
  ruText: string;
  scope: UiTextScope;
  updatedAt: string;
};

export type UiTextsResponse = {
  items: UiTextItem[];
  total: number;
};

export type UiTextsMapValue = {
  both?: string;
  web?: string;
  mobile?: string;
};

export type UiTextsMap = Record<string, UiTextsMapValue>;
