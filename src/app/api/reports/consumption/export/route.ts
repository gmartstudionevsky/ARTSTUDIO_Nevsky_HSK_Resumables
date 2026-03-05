import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

import { requireManagerOrAdminApi } from '@/lib/auth/guards';
import { ConsumptionReportResponse } from '@/lib/reports/types';

const querySchema = z.object({
  from: z.string().datetime({ offset: true }).or(z.string().date()),
  to: z.string().datetime({ offset: true }).or(z.string().date()),
  groupBy: z.enum(['expenseArticle', 'purpose']).optional().default('expenseArticle'),
  q: z.string().trim().optional(),
  limitGroups: z.coerce.number().int().min(1).max(500).optional().default(200),
  format: z.enum(['csv', 'xlsx']),
});

function sanitizeDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.replace(/[^0-9]/g, '').slice(0, 8) || 'invalid';
  return parsed.toISOString().slice(0, 10).replaceAll('-', '');
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

async function buildXlsx(rows: Array<Record<string, string>>): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Расход');

  worksheet.columns = [
    { header: 'group_code', key: 'group_code', width: 20 },
    { header: 'group_name', key: 'group_name', width: 36 },
    { header: 'item_code', key: 'item_code', width: 20 },
    { header: 'item_name', key: 'item_name', width: 36 },
    { header: 'qty', key: 'qty', width: 16 },
    { header: 'unit', key: 'unit', width: 16 },
  ];

  rows.forEach((row) => worksheet.addRow(row));

  const content = await workbook.xlsx.writeBuffer();
  return content instanceof Uint8Array ? content : new Uint8Array(content);
}

export async function GET(request: Request): Promise<NextResponse> {
  const authError = await requireManagerOrAdminApi();
  if (authError) return authError;

  try {
    const query = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    const consumptionUrl = new URL('/api/reports/consumption', request.url);
    consumptionUrl.searchParams.set('from', query.from);
    consumptionUrl.searchParams.set('to', query.to);
    consumptionUrl.searchParams.set('groupBy', query.groupBy);
    if (query.q) consumptionUrl.searchParams.set('q', query.q);
    consumptionUrl.searchParams.set('limitGroups', String(query.limitGroups));

    const consumptionResponse = await fetch(consumptionUrl, {
      headers: { cookie: request.headers.get('cookie') ?? '' },
      cache: 'no-store',
    });

    if (!consumptionResponse.ok) {
      const payload = (await consumptionResponse.json().catch(() => null)) as {
        error?: string;
      } | null;
      return NextResponse.json(
        { error: payload?.error ?? 'Не удалось сформировать отчёт' },
        { status: consumptionResponse.status },
      );
    }

    const report = (await consumptionResponse.json()) as ConsumptionReportResponse;
    const flatRows = report.groups.flatMap((group) =>
      group.rows.map((row) => ({
        group_code: group.key.code,
        group_name: group.key.name,
        item_code: row.item.code,
        item_name: row.item.name,
        qty: row.qtyReport,
        unit: row.reportUnit.name,
      })),
    );

    const fromPart = sanitizeDate(query.from);
    const toPart = sanitizeDate(query.to);
    const baseName = `consumption_${query.groupBy}_${fromPart}-${toPart}`;

    if (query.format === 'csv') {
      const headers = ['group_code', 'group_name', 'item_code', 'item_name', 'qty', 'unit'];
      const body = flatRows
        .map((row) => headers.map((key) => csvEscape(row[key as keyof typeof row])).join(','))
        .join('\n');
      const csv = `${headers.join(',')}\n${body}`;

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${baseName}.csv"`,
        },
      });
    }

    const xlsxBuffer = await buildXlsx(flatRows);
    const xlsxBody = Uint8Array.from(xlsxBuffer).buffer;
    return new NextResponse(xlsxBody, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${baseName}.xlsx"`,
      },
    });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json({ error: 'Некорректные параметры запроса' }, { status: 400 });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ошибка сервера' },
      { status: 500 },
    );
  }
}
