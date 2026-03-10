import ExcelJS from 'exceljs';

import { DirectoryRow, ImportCanonicalFieldMarkup, ImportIssue, ImportOpeningDetection, UnitRow } from '@/lib/import/types';

const DIRECTORY_SHEET = 'Справочник';
const UNITS_SHEET = 'Единицы';

const REQUIRED_DIRECTORY_COLUMNS = ['Код позиции', 'Позиция учёта', 'Раздел', 'Ед. базовая', 'Ед. учёта (по умолчанию)', 'Ед. отчёта (по умолчанию)', 'Статья затрат'];
const CANONICAL_DIRECTORY_COLUMNS = [...REQUIRED_DIRECTORY_COLUMNS, 'Мин. количество', 'Активно', 'Синонимы (если есть)', 'Комментарий (позиция)'];

const DIRECTORY_HEADER_ALIASES: Record<string, string[]> = {
  'Позиция учёта': ['Позиция учёта', 'Номенклатура'],
  'Раздел': ['Раздел', 'Назначение'],
  'Статья затрат': ['Статья затрат', 'Статья расходов'],
};

const OPENING_HEADER_ALIASES = ['Остаток на начало учёта', 'Остаток на 01.03.2026', 'Остаток на начало', 'Стартовый остаток'];
const OPENING_HEADER_KEYWORDS = ['остат', 'склад', 'старт', 'начал', 'учет'];

function normalizeHeader(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return null;
  if (['да', 'true', '1', 'y', 'yes'].includes(text)) return true;
  if (['нет', 'false', '0', 'n', 'no'].includes(text)) return false;
  return null;
}

function parseNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const normalized = String(value).trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapHeaders(rowValues: ExcelJS.CellValue[]): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 1; i < rowValues.length; i += 1) {
    const key = normalizeHeader(rowValues[i]);
    if (key) map.set(key, i);
  }
  return map;
}

function headerAt(rowValues: ExcelJS.CellValue[], index: number): string {
  return String(rowValues[index] ?? '').trim();
}

function resolveHeaderName(name: string): string[] {
  return DIRECTORY_HEADER_ALIASES[name] ?? [name];
}

function getCell(row: ExcelJS.Row, headers: Map<string, number>, name: string): unknown {
  for (const candidate of resolveHeaderName(name)) {
    const index = headers.get(normalizeHeader(candidate));
    if (index) return row.getCell(index).value;
  }
  return null;
}

function hasHeader(headers: Map<string, number>, name: string): boolean {
  return resolveHeaderName(name).some((candidate) => headers.has(normalizeHeader(candidate)));
}

function collectCanonicalMarkup(headers: Map<string, number>, headerRowValues: ExcelJS.CellValue[]): ImportCanonicalFieldMarkup[] {
  return CANONICAL_DIRECTORY_COLUMNS.map((field) => {
    const directIndex = headers.get(normalizeHeader(field));
    if (directIndex) {
      return { canonicalField: field, sourceHeader: headerAt(headerRowValues, directIndex), strategy: 'EXACT' };
    }

    const alias = (DIRECTORY_HEADER_ALIASES[field] ?? []).find((candidate) => headers.has(normalizeHeader(candidate)));
    if (alias) {
      const aliasIndex = headers.get(normalizeHeader(alias)) as number;
      return { canonicalField: field, sourceHeader: headerAt(headerRowValues, aliasIndex), strategy: 'ALIAS' };
    }

    return { canonicalField: field, sourceHeader: null, strategy: 'MISSING' };
  });
}

function detectOpeningHeader(headers: Map<string, number>, headerRowValues: ExcelJS.CellValue[]): ImportOpeningDetection {
  for (const candidate of OPENING_HEADER_ALIASES) {
    const index = headers.get(normalizeHeader(candidate));
    if (!index) continue;
    const sourceHeader = headerAt(headerRowValues, index);
    const match = sourceHeader.match(/(\d{2}\.\d{2}\.\d{4})/);
    return { sourceHeader, detectedDate: match?.[1] ?? null, strategy: candidate === 'Остаток на начало учёта' ? 'EXACT' : 'ALIAS' };
  }

  for (const [normalized, index] of headers.entries()) {
    const keywordMatched = OPENING_HEADER_KEYWORDS.every((keyword) => normalized.includes(keyword))
      || (normalized.includes('остат') && (normalized.includes('склад') || normalized.includes('начал')));
    if (!keywordMatched) continue;
    const sourceHeader = headerAt(headerRowValues, index);
    const match = sourceHeader.match(/(\d{2}\.\d{2}\.\d{4})/);
    return { sourceHeader, detectedDate: match?.[1] ?? null, strategy: 'KEYWORD' };
  }

  return { sourceHeader: null, detectedDate: null, strategy: 'MISSING' };
}

export type ParsedImportResult = {
  directoryRows: DirectoryRow[];
  unitRows: UnitRow[];
  parseErrors: ImportIssue[];
  markup: {
    canonicalFields: ImportCanonicalFieldMarkup[];
    opening: ImportOpeningDetection;
  };
};

export async function parseImportWorkbook(buffer: ArrayBuffer): Promise<ParsedImportResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const parseErrors: ImportIssue[] = [];
  const directorySheet = workbook.getWorksheet(DIRECTORY_SHEET);
  const unitsSheet = workbook.getWorksheet(UNITS_SHEET);

  if (!directorySheet) parseErrors.push({ sheet: DIRECTORY_SHEET, row: 1, column: '-', message: 'Не найден лист “Справочник”.' });
  if (!unitsSheet) parseErrors.push({ sheet: UNITS_SHEET, row: 1, column: '-', message: 'Не найден лист “Единицы”.' });

  if (!directorySheet || !unitsSheet) {
    return {
      directoryRows: [],
      unitRows: [],
      parseErrors,
      markup: {
        canonicalFields: CANONICAL_DIRECTORY_COLUMNS.map((field) => ({ canonicalField: field, sourceHeader: null, strategy: 'MISSING' })),
        opening: { sourceHeader: null, detectedDate: null, strategy: 'MISSING' },
      },
    };
  }

  const directoryHeaderRow = directorySheet.getRow(1).values as ExcelJS.CellValue[];
  const directoryHeaders = mapHeaders(directoryHeaderRow);
  const canonicalFieldMarkup = collectCanonicalMarkup(directoryHeaders, directoryHeaderRow);
  const openingDetection = detectOpeningHeader(directoryHeaders, directoryHeaderRow);

  for (const col of REQUIRED_DIRECTORY_COLUMNS) {
    if (!hasHeader(directoryHeaders, col)) {
      parseErrors.push({ sheet: DIRECTORY_SHEET, row: 1, column: col, message: 'Отсутствует обязательная колонка.' });
    }
  }

  const openingHeaderIndex = openingDetection.sourceHeader
    ? directoryHeaders.get(normalizeHeader(openingDetection.sourceHeader)) ?? null
    : null;

  const directoryRows: DirectoryRow[] = [];
  for (let rowNumber = 2; rowNumber <= directorySheet.rowCount; rowNumber += 1) {
    const row = directorySheet.getRow(rowNumber);
    const code = String(getCell(row, directoryHeaders, 'Код позиции') ?? '').trim();
    if (!code) continue;

    const activeRaw = getCell(row, directoryHeaders, 'Активно');
    const activeParsed = parseBoolean(activeRaw);
    const minQty = parseNumber(getCell(row, directoryHeaders, 'Мин. количество'));
    const openingQty = openingHeaderIndex ? parseNumber(row.getCell(openingHeaderIndex).value) ?? 0 : 0;

    directoryRows.push({
      rowNumber,
      code,
      name: String(getCell(row, directoryHeaders, 'Позиция учёта') ?? '').trim(),
      sectionCode: String(getCell(row, directoryHeaders, 'Раздел') ?? '').trim(),
      baseUnit: String(getCell(row, directoryHeaders, 'Ед. базовая') ?? '').trim(),
      defaultInputUnit: String(getCell(row, directoryHeaders, 'Ед. учёта (по умолчанию)') ?? '').trim(),
      reportUnit: String(getCell(row, directoryHeaders, 'Ед. отчёта (по умолчанию)') ?? '').trim(),
      minQtyBase: minQty,
      openingQty,
      expenseArticleCode: String(getCell(row, directoryHeaders, 'Статья затрат') ?? '').trim(),
      isActive: activeParsed ?? true,
      synonyms: String(getCell(row, directoryHeaders, 'Синонимы (если есть)') ?? '').trim() || null,
      note: String(getCell(row, directoryHeaders, 'Комментарий (позиция)') ?? '').trim() || null,
    });
  }

  const unitHeaders = mapHeaders(unitsSheet.getRow(1).values as ExcelJS.CellValue[]);
  const unitRows: UnitRow[] = [];

  for (let rowNumber = 2; rowNumber <= unitsSheet.rowCount; rowNumber += 1) {
    const row = unitsSheet.getRow(rowNumber);
    const accountingPositionCode = String(getCell(row, unitHeaders, 'Код позиции') ?? '').trim();
    if (!accountingPositionCode) continue;

    unitRows.push({
      rowNumber,
      accountingPositionCode,
      itemCode: accountingPositionCode,
      unitName: String(getCell(row, unitHeaders, 'Ед. изм.') ?? '').trim(),
      factorToBase: parseNumber(getCell(row, unitHeaders, 'Коэффициент к базовой')) ?? Number.NaN,
      isAllowed: parseBoolean(getCell(row, unitHeaders, 'Доступно')) ?? true,
      isDefaultInput: parseBoolean(getCell(row, unitHeaders, 'По умолчанию (для ввода)')) ?? false,
      isDefaultReport: parseBoolean(getCell(row, unitHeaders, 'По умолчанию (для отчёта)')) ?? false,
    });
  }

  return {
    directoryRows,
    unitRows,
    parseErrors,
    markup: {
      canonicalFields: canonicalFieldMarkup,
      opening: openingDetection,
    },
  };
}
