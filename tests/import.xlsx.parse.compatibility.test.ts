import assert from 'node:assert/strict';
import test from 'node:test';

import ExcelJS from 'exceljs';

import { parseImportWorkbook } from '../src/lib/import/xlsx/parse';

async function workbookBufferWithDirectoryHeaders(headers: string[], row: string[]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const directory = workbook.addWorksheet('Справочник');
  const units = workbook.addWorksheet('Единицы');

  directory.addRow(headers);
  directory.addRow(row);

  units.addRow(['Код позиции', 'Ед. изм.', 'Коэффициент к базовой', 'Доступно', 'По умолчанию (для учёта)', 'По умолчанию (для отчёта)']);
  units.addRow(['IT-001', 'шт', 1, 'да', 'да', 'да']);

  const output = await workbook.xlsx.writeBuffer();
  if (output instanceof ArrayBuffer) return output;
  const bytes = output as Uint8Array;
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

test('parseImportWorkbook: legacy header "Назначение" maps to canonical "Раздел" (compatibility-only)', async () => {
  const headers = [
    'Код позиции',
    'Позиция учёта',
    'Назначение',
    'Ед. базовая',
    'Ед. учёта (по умолчанию)',
    'Ед. отчёта (по умолчанию)',
    'Статья затрат',
  ];

  const row = ['IT-001', 'Тестовая позиция', 'Раздел A', 'шт', 'шт', 'шт', '2.1.4'];

  const parsed = await parseImportWorkbook(await workbookBufferWithDirectoryHeaders(headers, row));

  assert.equal(parsed.parseErrors.length, 0);
  assert.equal(parsed.directoryRows[0]?.category, 'Раздел A');
  assert.equal(parsed.directoryRows[0]?.purposeCode, '2.1.4');
});

test('parseImportWorkbook: legacy header "Статья расходов" maps to canonical "Статья затрат"', async () => {
  const headers = [
    'Код позиции',
    'Номенклатура',
    'Раздел',
    'Ед. базовая',
    'Ед. учёта (по умолчанию)',
    'Ед. отчёта (по умолчанию)',
    'Статья расходов',
  ];

  const row = ['IT-001', 'Тестовая позиция', 'Раздел A', 'шт', 'шт', 'шт', '2.1.4'];

  const parsed = await parseImportWorkbook(await workbookBufferWithDirectoryHeaders(headers, row));

  assert.equal(parsed.parseErrors.length, 0);
  assert.equal(parsed.directoryRows[0]?.name, 'Тестовая позиция');
  assert.equal(parsed.directoryRows[0]?.purposeCode, '2.1.4');
});
