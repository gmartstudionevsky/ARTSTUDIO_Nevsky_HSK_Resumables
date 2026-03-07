import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { evaluateAccountingPositionInvariants, mapItemRecordToAccountingPosition } from '@/lib/domain/accounting-position';
import { ConsumptionGroupBy, ConsumptionReportResponse } from '@/lib/reports/types';

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

async function fetchConsumptionRows({ from, to, groupBy, q, limitGroups }: { from: Date; to: Date; groupBy: ConsumptionGroupBy; q?: string; limitGroups: number }): Promise<RawRow[]> {
  const pattern = q ? `%${q}%` : null;

  if (groupBy === 'purpose') {
    return prisma.$queryRaw<RawRow[]>(Prisma.sql`
      WITH agg AS (
        SELECT tl."purposeId" AS "groupId", tl."itemId", SUM(tl."qtyBase")::numeric AS "qtyBase"
        FROM "TransactionLine" tl
        JOIN "Transaction" tx ON tx.id = tl."transactionId"
        JOIN "Item" i ON i.id = tl."itemId"
        WHERE tx.type = 'OUT' AND tx.status = 'ACTIVE' AND tl.status = 'ACTIVE'
          AND tx."occurredAt" >= ${from} AND tx."occurredAt" <= ${to}
          ${pattern ? Prisma.sql`AND (i.code ILIKE ${pattern} OR i.name ILIKE ${pattern})` : Prisma.empty}
        GROUP BY tl."purposeId", tl."itemId"
      ),
      top_groups AS (
        SELECT p.id, p.code, p.name
        FROM agg a JOIN "Purpose" p ON p.id = a."groupId"
        GROUP BY p.id, p.code, p.name
        ORDER BY p.code ASC, p.name ASC
        LIMIT ${limitGroups}
      )
      SELECT tg.id AS "groupId", tg.code AS "groupCode", tg.name AS "groupName",
        i.id AS "itemId", i.code AS "itemCode", i.name AS "itemName",
        ru.id AS "reportUnitId", ru.name AS "reportUnitName", a."qtyBase"::numeric AS "qtyBase",
        (a."qtyBase" / NULLIF(COALESCE(iu."factorToBase", 1)::numeric, 0))::numeric AS "qtyReport", (iu.id IS NULL) AS "factorFallback"
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
      SELECT tl."expenseArticleId" AS "groupId", tl."itemId", SUM(tl."qtyBase")::numeric AS "qtyBase"
      FROM "TransactionLine" tl
      JOIN "Transaction" tx ON tx.id = tl."transactionId"
      JOIN "Item" i ON i.id = tl."itemId"
      WHERE tx.type = 'OUT' AND tx.status = 'ACTIVE' AND tl.status = 'ACTIVE'
        AND tx."occurredAt" >= ${from} AND tx."occurredAt" <= ${to}
        ${pattern ? Prisma.sql`AND (i.code ILIKE ${pattern} OR i.name ILIKE ${pattern})` : Prisma.empty}
      GROUP BY tl."expenseArticleId", tl."itemId"
    ),
    top_groups AS (
      SELECT ea.id, ea.code, ea.name
      FROM agg a JOIN "ExpenseArticle" ea ON ea.id = a."groupId"
      GROUP BY ea.id, ea.code, ea.name
      ORDER BY ea.code ASC, ea.name ASC
      LIMIT ${limitGroups}
    )
    SELECT tg.id AS "groupId", tg.code AS "groupCode", tg.name AS "groupName",
      i.id AS "itemId", i.code AS "itemCode", i.name AS "itemName",
      ru.id AS "reportUnitId", ru.name AS "reportUnitName", a."qtyBase"::numeric AS "qtyBase",
      (a."qtyBase" / NULLIF(COALESCE(iu."factorToBase", 1)::numeric, 0))::numeric AS "qtyReport", (iu.id IS NULL) AS "factorFallback"
    FROM agg a
    JOIN top_groups tg ON tg.id = a."groupId"
    JOIN "Item" i ON i.id = a."itemId"
    JOIN "Unit" ru ON ru.id = i."reportUnitId"
    LEFT JOIN "ItemUnit" iu ON iu."itemId" = i.id AND iu."unitId" = i."reportUnitId" AND iu."isDefaultReport" = true
    ORDER BY tg.code ASC, tg.name ASC, a."qtyBase" DESC, i.code ASC
  `);
}

async function getExpandedMetricsEligibility(itemIds: string[]): Promise<Map<string, { expandedMetrics: boolean; reasons: string[] }>> {
  if (itemIds.length === 0) return new Map();
  const items = await prisma.item.findMany({
    where: { id: { in: itemIds } },
    select: {
      id: true, code: true, name: true, isActive: true, minQtyBase: true, synonyms: true, note: true,
      category: { select: { id: true, name: true } },
      defaultExpenseArticle: { select: { id: true, code: true, name: true } },
      defaultPurpose: { select: { id: true, code: true, name: true } },
      baseUnit: { select: { id: true, name: true } },
      defaultInputUnit: { select: { id: true, name: true } },
      reportUnit: { select: { id: true, name: true } },
    },
  });

  return new Map(
    items.map((item) => {
      const position = mapItemRecordToAccountingPosition(item, { strict: false });
      return [item.id, evaluateAccountingPositionInvariants(position).projectionEligibility];
    }),
  );
}


export function buildConsumptionReportProjectionFromRows(rows: RawRow[], from: string, to: string, groupBy: ConsumptionGroupBy, eligibilityMap: Map<string, { expandedMetrics: boolean; reasons: string[] }>): ConsumptionReportResponse {
  const groupsMap = new Map<string, ConsumptionReportResponse['groups'][number]>();
  const warnings = new Set<string>();

  rows
    .filter((row) => eligibilityMap.get(row.itemId)?.expandedMetrics ?? true)
    .forEach((row) => {
      if (!groupsMap.has(row.groupId)) {
        groupsMap.set(row.groupId, {
          key: { id: row.groupId, code: row.groupCode, name: row.groupName },
          rows: [],
        });
      }

      if (row.factorFallback) warnings.add(`REPORT_FACTOR_FALLBACK:${row.itemCode}`);
      groupsMap.get(row.groupId)?.rows.push({
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
      rowsTotal: Array.from(groupsMap.values()).reduce((acc, group) => acc + group.rows.length, 0),
      ...(warnings.size > 0 ? { warnings: Array.from(warnings) } : {}),
    },
  };
}
export async function getConsumptionReportProjection({ from, to, groupBy, q, limitGroups }: { from: string; to: string; groupBy: ConsumptionGroupBy; q?: string; limitGroups: number }): Promise<ConsumptionReportResponse> {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const rows = await fetchConsumptionRows({ from: fromDate, to: toDate, groupBy, q, limitGroups });
  const eligibilityMap = await getExpandedMetricsEligibility([...new Set(rows.map((row) => row.itemId))]);
  return buildConsumptionReportProjectionFromRows(rows, from, to, groupBy, eligibilityMap);
}
