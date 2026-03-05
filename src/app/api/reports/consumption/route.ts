import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

import { requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { ConsumptionGroupBy, ConsumptionReportResponse } from '@/lib/reports/types';

const querySchema = z.object({
  from: z.string().datetime({ offset: true }).or(z.string().date()),
  to: z.string().datetime({ offset: true }).or(z.string().date()),
  groupBy: z.enum(['expenseArticle', 'purpose']).optional().default('expenseArticle'),
  q: z.string().trim().optional(),
  limitGroups: z.coerce.number().int().min(1).max(500).optional().default(200),
});

type RawRow = {
  groupId: string;
  groupCode: string;
  groupName: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  reportUnitId: string;
  reportUnitName: string;
  qtyBase: Prisma.Decimal;
  qtyReport: Prisma.Decimal;
  factorFallback: boolean;
};

function toDecimalString(value: Prisma.Decimal | string | number): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return value.toString();
}

async function fetchConsumptionRows({
  from,
  to,
  groupBy,
  q,
  limitGroups,
}: {
  from: Date;
  to: Date;
  groupBy: ConsumptionGroupBy;
  q?: string;
  limitGroups: number;
}): Promise<RawRow[]> {
  const pattern = q ? `%${q}%` : null;

  if (groupBy === 'purpose') {
    return prisma.$queryRaw<RawRow[]>(Prisma.sql`
      WITH agg AS (
        SELECT
          tl."purposeId" AS "groupId",
          tl."itemId",
          SUM(tl."qtyBase")::numeric AS "qtyBase"
        FROM "TransactionLine" tl
        JOIN "Transaction" tx ON tx.id = tl."transactionId"
        JOIN "Item" i ON i.id = tl."itemId"
        WHERE tx.type = 'OUT'
          AND tx.status = 'ACTIVE'
          AND tl.status = 'ACTIVE'
          AND tx."occurredAt" >= ${from}
          AND tx."occurredAt" <= ${to}
          ${pattern ? Prisma.sql`AND (i.code ILIKE ${pattern} OR i.name ILIKE ${pattern})` : Prisma.empty}
        GROUP BY tl."purposeId", tl."itemId"
      ),
      top_groups AS (
        SELECT
          p.id,
          p.code,
          p.name
        FROM agg a
        JOIN "Purpose" p ON p.id = a."groupId"
        GROUP BY p.id, p.code, p.name
        ORDER BY p.code ASC, p.name ASC
        LIMIT ${limitGroups}
      )
      SELECT
        tg.id AS "groupId",
        tg.code AS "groupCode",
        tg.name AS "groupName",
        i.id AS "itemId",
        i.code AS "itemCode",
        i.name AS "itemName",
        ru.id AS "reportUnitId",
        ru.name AS "reportUnitName",
        a."qtyBase"::numeric AS "qtyBase",
        (a."qtyBase" / NULLIF(COALESCE(iu."factorToBase", 1)::numeric, 0))::numeric AS "qtyReport",
        (iu.id IS NULL) AS "factorFallback"
      FROM agg a
      JOIN top_groups tg ON tg.id = a."groupId"
      JOIN "Item" i ON i.id = a."itemId"
      JOIN "Unit" ru ON ru.id = i."reportUnitId"
      LEFT JOIN "ItemUnit" iu ON iu."itemId" = i.id AND iu."unitId" = i."reportUnitId" AND iu."isDefaultReport" = true
      ORDER BY tg.code ASC, tg.name ASC, a."qtyBase" DESC, i.code ASC
    `);
  }

  return prisma.$queryRaw<RawRow[]>(Prisma.sql`
    WITH agg AS (
      SELECT
        tl."expenseArticleId" AS "groupId",
        tl."itemId",
        SUM(tl."qtyBase")::numeric AS "qtyBase"
      FROM "TransactionLine" tl
      JOIN "Transaction" tx ON tx.id = tl."transactionId"
      JOIN "Item" i ON i.id = tl."itemId"
      WHERE tx.type = 'OUT'
        AND tx.status = 'ACTIVE'
        AND tl.status = 'ACTIVE'
        AND tx."occurredAt" >= ${from}
        AND tx."occurredAt" <= ${to}
        ${pattern ? Prisma.sql`AND (i.code ILIKE ${pattern} OR i.name ILIKE ${pattern})` : Prisma.empty}
      GROUP BY tl."expenseArticleId", tl."itemId"
    ),
    top_groups AS (
      SELECT
        ea.id,
        ea.code,
        ea.name
      FROM agg a
      JOIN "ExpenseArticle" ea ON ea.id = a."groupId"
      GROUP BY ea.id, ea.code, ea.name
      ORDER BY ea.code ASC, ea.name ASC
      LIMIT ${limitGroups}
    )
    SELECT
      tg.id AS "groupId",
      tg.code AS "groupCode",
      tg.name AS "groupName",
      i.id AS "itemId",
      i.code AS "itemCode",
      i.name AS "itemName",
      ru.id AS "reportUnitId",
      ru.name AS "reportUnitName",
      a."qtyBase"::numeric AS "qtyBase",
      (a."qtyBase" / NULLIF(COALESCE(iu."factorToBase", 1)::numeric, 0))::numeric AS "qtyReport",
      (iu.id IS NULL) AS "factorFallback"
    FROM agg a
    JOIN top_groups tg ON tg.id = a."groupId"
    JOIN "Item" i ON i.id = a."itemId"
    JOIN "Unit" ru ON ru.id = i."reportUnitId"
    LEFT JOIN "ItemUnit" iu ON iu."itemId" = i.id AND iu."unitId" = i."reportUnitId" AND iu."isDefaultReport" = true
    ORDER BY tg.code ASC, tg.name ASC, a."qtyBase" DESC, i.code ASC
  `);
}

function buildResponse(
  rows: RawRow[],
  from: string,
  to: string,
  groupBy: ConsumptionGroupBy,
): ConsumptionReportResponse {
  const groupsMap = new Map<string, ConsumptionReportResponse['groups'][number]>();
  const warnings = new Set<string>();

  rows.forEach((row) => {
    const groupKey = row.groupId;
    const existing = groupsMap.get(groupKey);
    if (!existing) {
      groupsMap.set(groupKey, {
        key: { id: row.groupId, code: row.groupCode, name: row.groupName },
        rows: [],
      });
    }

    if (row.factorFallback) {
      warnings.add(`REPORT_FACTOR_FALLBACK:${row.itemCode}`);
    }

    groupsMap.get(groupKey)?.rows.push({
      item: { id: row.itemId, code: row.itemCode, name: row.itemName },
      reportUnit: { id: row.reportUnitId, name: row.reportUnitName },
      qtyBase: toDecimalString(row.qtyBase),
      qtyReport: toDecimalString(row.qtyReport),
    });
  });

  return {
    from,
    to,
    groupBy,
    groups: Array.from(groupsMap.values()),
    meta: {
      rowsTotal: rows.length,
      ...(warnings.size > 0 ? { warnings: Array.from(warnings) } : {}),
    },
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  const { error } = await requireSupervisorOrAboveApi();
  if (error) return error;

  try {
    const query = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    const fromDate = new Date(query.from);
    const toDate = new Date(query.to);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return NextResponse.json({ error: 'Некорректные параметры периода' }, { status: 400 });
    }

    const rows = await fetchConsumptionRows({
      from: fromDate,
      to: toDate,
      groupBy: query.groupBy,
      q: query.q,
      limitGroups: query.limitGroups,
    });

    return NextResponse.json(buildResponse(rows, query.from, query.to, query.groupBy));
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json({ error: 'Некорректные параметры запроса' }, { status: 400 });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ошибка сервера' },
      { status: 500 },
    );
  }
}
