import { AccountingPosition } from '@prisma/client';

import { ImportSyncPlanRow, NormalizedImportPayload, ImportIssue } from '@/lib/import/types';
import { ParsedImportResult } from '@/lib/import/xlsx/parse';

function pushError(list: ImportIssue[], sheet: string, row: number, column: string, message: string): void {
  list.push({ sheet, row, column, message });
}

function normalize(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseSynonyms(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,;|]/)
    .map((part) => normalize(part))
    .filter(Boolean);
}

function pickSyncRows(parsed: ParsedImportResult, existingItems: Array<Pick<AccountingPosition, 'id' | 'code' | 'name' | 'synonyms' | 'categoryId'> & { category: { name: string } }>): ImportSyncPlanRow[] {
  const rows: ImportSyncPlanRow[] = [];

  for (const row of parsed.directoryRows) {
    const rowCode = normalize(row.code);
    const rowName = normalize(row.name);
    const rowSection = normalize(row.sectionCode);
    const rowAliases = new Set([rowName, ...parseSynonyms(row.synonyms)]);

    const candidates = existingItems
      .map((item) => {
        const itemCode = normalize(item.code);
        const itemName = normalize(item.name);
        const itemCategory = normalize(item.category.name);
        const itemAliases = new Set([itemName, ...parseSynonyms(item.synonyms)]);

        const codeExact = rowCode && rowCode === itemCode;
        const nameExact = rowName && rowName === itemName;
        const nameAlias = [...rowAliases].some((alias) => itemAliases.has(alias));
        const categoryExact = rowSection && rowSection === itemCategory;

        let score = 0;
        const reasons: string[] = [];

        if (codeExact) {
          score += 100;
          reasons.push('Совпал код');
        }
        if (nameExact) {
          score += 60;
          reasons.push('Совпало название');
        } else if (nameAlias) {
          score += 40;
          reasons.push('Совпал синоним');
        }
        if (categoryExact) {
          score += 20;
          reasons.push('Совпал раздел');
        }

        return {
          accountingPositionId: item.id,
          itemId: item.id,
          code: item.code,
          name: item.name,
          category: item.category.name,
          score,
          reason: reasons.join(', ') || 'Нет явных совпадений',
        };
      })
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const missingRequired: string[] = [];
    if (!row.name) missingRequired.push('Позиция учёта');
    if (!row.sectionCode) missingRequired.push('Раздел');
    if (!row.baseUnit) missingRequired.push('Ед. базовая');
    if (!row.defaultInputUnit) missingRequired.push('Ед. учёта (по умолчанию)');
    if (!row.reportUnit) missingRequired.push('Ед. отчёта (по умолчанию)');
    if (!row.expenseArticleCode) missingRequired.push('Статья затрат');

    const best = candidates[0];
    const autoMatched = Boolean(best && best.score >= 120);
    const needsReview = !autoMatched && candidates.length > 0;

    rows.push({
      rowNumber: row.rowNumber,
      sourceCode: row.code,
      sourceName: row.name,
      sourceCategory: row.sectionCode,
      sourceKey: normalize(`${row.code}::${row.name}::${row.sectionCode}`),
      status: autoMatched ? 'MATCHED' : needsReview ? 'NEEDS_REVIEW' : 'CREATE',
      selectedAccountingPositionId: autoMatched ? best.accountingPositionId : null,
      selectedItemId: autoMatched ? best.accountingPositionId : null,
      selectedReason: autoMatched ? `Автосопоставление: ${best.reason}` : null,
      candidates,
      missingRequired,
    });
  }

  return rows;
}

export function validateImportData(
  parsed: ParsedImportResult,
  existingItems: Array<Pick<AccountingPosition, 'id' | 'code' | 'name' | 'synonyms' | 'categoryId'> & { category: { name: string } }> = []
): NormalizedImportPayload {
  const errors: ImportIssue[] = [...parsed.parseErrors];
  const warnings: ImportIssue[] = [];

  const required = [
    ['code', 'Код позиции'],
    ['name', 'Позиция учёта'],
    ['sectionCode', 'Раздел'],
    ['baseUnit', 'Ед. базовая'],
    ['defaultInputUnit', 'Ед. учёта (по умолчанию)'],
    ['reportUnit', 'Ед. отчёта (по умолчанию)'],
    ['expenseArticleCode', 'Статья затрат'],
  ] as const;

  const codeSet = new Set<string>();

  for (const row of parsed.directoryRows) {
    for (const [field, column] of required) {
      if (!row[field]) {
        pushError(errors, 'Справочник', row.rowNumber, column, 'Поле обязательно.');
      }
    }

    if (codeSet.has(row.code)) {
      pushError(errors, 'Справочник', row.rowNumber, 'Код позиции', 'Дублирующийся код позиции.');
    }
    codeSet.add(row.code);

    if (row.minQtyBase !== null && !Number.isFinite(row.minQtyBase)) {
      pushError(errors, 'Справочник', row.rowNumber, 'Мин. количество', 'Некорректное число.');
    }
    const openingColumn = parsed.markup.opening.sourceHeader ?? 'Остаток на начало учёта';
    if (!Number.isFinite(row.openingQty)) {
      pushError(errors, 'Справочник', row.rowNumber, openingColumn, 'Некорректное число.');
    }
    if (row.openingQty < 0) {
      pushError(errors, 'Справочник', row.rowNumber, openingColumn, 'Отрицательные остатки запрещены.');
    }
  }

  const unitsByItem = new Map<string, typeof parsed.unitRows>();
  for (const row of parsed.unitRows) {
    const list = unitsByItem.get(row.accountingPositionCode) ?? [];
    list.push(row);
    unitsByItem.set(row.accountingPositionCode, list);

    if (!row.unitName) {
      pushError(errors, 'Единицы', row.rowNumber, 'Ед. изм.', 'Поле обязательно.');
    }
    if (!Number.isFinite(row.factorToBase) || row.factorToBase <= 0) {
      pushError(errors, 'Единицы', row.rowNumber, 'Коэффициент к базовой', 'Коэффициент должен быть > 0.');
    }
    if (!row.isAllowed && (row.isDefaultInput || row.isDefaultReport)) {
      pushError(errors, 'Единицы', row.rowNumber, 'Доступно', 'Недоступная единица не может быть по умолчанию.');
    }
  }

  for (const row of parsed.directoryRows) {
    const units = unitsByItem.get(row.code) ?? [];
    if (!units.some((unitRow) => unitRow.isDefaultReport)) {
      warnings.push({
        sheet: 'Единицы',
        row: row.rowNumber,
        column: 'По умолчанию (для отчёта)',
        message: `Для позиции ${row.code} defaultReport не указан — будет использована единица отчёта из “Справочник”.`,
      });
    }
  }

  const sectionSet = new Set(parsed.directoryRows.map((row) => row.sectionCode).filter(Boolean));
  const expenseArticleSet = new Set(parsed.directoryRows.map((row) => row.expenseArticleCode).filter(Boolean));
  const unitSet = new Set<string>();

  for (const row of parsed.directoryRows) {
    if (row.baseUnit) unitSet.add(row.baseUnit);
    if (row.defaultInputUnit) unitSet.add(row.defaultInputUnit);
    if (row.reportUnit) unitSet.add(row.reportUnit);
  }
  for (const row of parsed.unitRows) {
    if (row.unitName) unitSet.add(row.unitName);
  }

  const openingLines = parsed.directoryRows.filter((row) => row.openingQty > 0).length;
  const syncRows = pickSyncRows(parsed, existingItems);

  return {
    summary: {
      accountingPositions: parsed.directoryRows.length,
      items: parsed.directoryRows.length,
      categories: sectionSet.size,
      units: unitSet.size,
      expenseArticles: expenseArticleSet.size,
      sections: sectionSet.size,
      purposes: sectionSet.size,
      accountingPositionUnits: parsed.unitRows.length,
      itemUnits: parsed.unitRows.length,
      openingLines,
      syncMatched: syncRows.filter((row) => row.status === 'MATCHED').length,
      syncCreated: syncRows.filter((row) => row.status === 'CREATE').length,
      syncSkipped: syncRows.filter((row) => row.status === 'SKIP').length,
      syncNeedsReview: syncRows.filter((row) => row.status === 'NEEDS_REVIEW').length,
    },
    errors,
    warnings,
    rows: {
      directory: parsed.directoryRows,
      units: parsed.unitRows,
    },
    markup: parsed.markup,
    syncPlan: {
      mode: 'AUTO',
      rows: syncRows,
    },
  };
}
