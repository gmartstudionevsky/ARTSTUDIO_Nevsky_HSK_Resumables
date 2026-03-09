import { UiTextScope } from '@prisma/client';

export type CanonicalUiText = {
  key: string;
  ruText: string;
  scope?: UiTextScope;
};

export const canonicalUiTexts: CanonicalUiText[] = [
  { key: 'nav.stock', ruText: 'Склад' },
  { key: 'nav.movements', ruText: 'Движения' },
  { key: 'nav.inventory', ruText: 'Инвентаризация' },
  { key: 'nav.history', ruText: 'История' },
  { key: 'nav.profile', ruText: 'Профиль' },
  { key: 'nav.catalog', ruText: 'Каталог позиций' },
  { key: 'nav.reports', ruText: 'Отчёты' },
  { key: 'nav.admin.dictionaries', ruText: 'Справочники' },
  { key: 'nav.admin.users', ruText: 'Пользователи' },
  { key: 'nav.admin.telegram', ruText: 'Telegram' },
  { key: 'nav.admin.uiTexts', ruText: 'Тексты интерфейса' },
  { key: 'nav.admin.settings', ruText: 'Политики данных' },
  { key: 'nav.admin.periodLocks', ruText: 'Закрытие периода' },
  { key: 'tooltip.reportUnit', ruText: 'Единица отчётности — в ней показывается склад и отчёты.' },
  { key: 'tooltip.section', ruText: 'Раздел — основной рабочий контекст движения и учёта.' },
  { key: 'tooltip.expenseArticle', ruText: 'Статья затрат — финансово-учётная аналитика для отчётов.' },
];

const LEGACY_UI_TEXTS_BY_KEY: Record<string, string[]> = {
  'nav.catalog': ['Номенклатура'],
  'nav.movements': ['Операция', 'Операции'],
  'tooltip.section': ['Назначение — основной рабочий контекст движения и учёта.'],
};

export function shouldRepairUiTextToCanonical(input: { key: string; currentText: string; canonicalText: string }): boolean {
  const { key, currentText, canonicalText } = input;
  if (currentText === canonicalText) return false;

  const legacyTexts = LEGACY_UI_TEXTS_BY_KEY[key] ?? [];
  return legacyTexts.includes(currentText);
}

