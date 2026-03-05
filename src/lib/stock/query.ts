import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { StockItemSnapshot, StockListItem, StockListQuery, StockListResponse, StockStatusFilter } from '@/lib/stock/types';

type StockRow = {
  itemId: string;
  code: string;
  name: string;
  categoryId: string;
  categoryName: string;
  expenseArticleId: string;
  expenseArticleCode: string;
  expenseArticleName: string;
  purposeId: string;
  purposeCode: string;
  purposeName: string;
  reportUnitId: string;
  reportUnitName: string;
  qtyBase: Prisma.Decimal;
  qtyReport: Prisma.Decimal;
  minQtyBase: Prisma.Decimal | null;
  status: 'OK' | 'BELOW_MIN' | 'ZERO';
  isNegative: boolean;
  isActive: boolean;
  factorFallback: boolean;
  reportFactorToBase: Prisma.Decimal;
};

function toDecimalString(value: Prisma.Decimal | string | number | null): string | null {
  if (value === null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return value.toString();
}

function statusClause(status: StockStatusFilter): Prisma.Sql {
  if (status === 'zero') return Prisma.sql`AND stock."qtyBase" = 0`;
  if (status === 'belowMin') return Prisma.sql`AND stock."qtyBase" <> 0 AND stock."minQtyBase" IS NOT NULL AND stock."qtyBase" < stock."minQtyBase"`;
  if (status === 'ok') return Prisma.sql`AND NOT (stock."qtyBase" = 0 OR (stock."minQtyBase" IS NOT NULL AND stock."qtyBase" < stock."minQtyBase"))`;
  return Prisma.sql``;
}

function buildFilters(query: Required<Pick<StockListQuery, 'status' | 'active'>> & StockListQuery): Prisma.Sql {
  const filters: Prisma.Sql[] = [];

  if (query.active !== 'all') filters.push(Prisma.sql`AND i."isActive" = ${query.active === 'true'}`);
  if (query.categoryId) filters.push(Prisma.sql`AND i."categoryId" = ${query.categoryId}::uuid`);
  if (query.expenseArticleId) filters.push(Prisma.sql`AND i."defaultExpenseArticleId" = ${query.expenseArticleId}::uuid`);
  if (query.purposeId) filters.push(Prisma.sql`AND i."defaultPurposeId" = ${query.purposeId}::uuid`);
  if (query.q) {
    const pattern = `%${query.q}%`;
    filters.push(Prisma.sql`AND (i.code ILIKE ${pattern} OR i.name ILIKE ${pattern} OR COALESCE(i.synonyms, '') ILIKE ${pattern})`);
  }
  filters.push(statusClause(query.status));

  return Prisma.sql`${Prisma.join(filters, ' ')}`;
}

function baseCte(filters: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`
WITH line_agg AS (
  SELECT
    tl."itemId",
    COALESCE(SUM(CASE
      WHEN tx.type IN ('IN', 'OPENING', 'ADJUST', 'INVENTORY_APPLY') THEN tl."qtyBase"
      WHEN tx.type = 'OUT' THEN -tl."qtyBase"
      ELSE 0
    END), 0) AS "qtyBase"
  FROM "TransactionLine" tl
  JOIN "Transaction" tx ON tx.id = tl."transactionId"
  WHERE tl.status = 'ACTIVE'
  GROUP BY tl."itemId"
), stock AS (
  SELECT
    i.id AS "itemId",
    i.code,
    i.name,
    c.id AS "categoryId",
    c.name AS "categoryName",
    ea.id AS "expenseArticleId",
    ea.code AS "expenseArticleCode",
    ea.name AS "expenseArticleName",
    p.id AS "purposeId",
    p.code AS "purposeCode",
    p.name AS "purposeName",
    ru.id AS "reportUnitId",
    ru.name AS "reportUnitName",
    COALESCE(la."qtyBase", 0)::numeric AS "qtyBase",
    i."minQtyBase",
    i."isActive",
    COALESCE(iu."factorToBase", 1)::numeric AS "reportFactorToBase",
    (iu.id IS NULL) AS "factorFallback"
  FROM "Item" i
  LEFT JOIN line_agg la ON la."itemId" = i.id
  JOIN "Category" c ON c.id = i."categoryId"
  JOIN "ExpenseArticle" ea ON ea.id = i."defaultExpenseArticleId"
  JOIN "Purpose" p ON p.id = i."defaultPurposeId"
  JOIN "Unit" ru ON ru.id = i."reportUnitId"
  LEFT JOIN "ItemUnit" iu ON iu."itemId" = i.id AND iu."unitId" = i."reportUnitId" AND iu."isDefaultReport" = true
  WHERE 1 = 1
  ${filters}
)
`;
}

function mapRow(row: StockRow): StockListItem {
  return {
    itemId: row.itemId,
    code: row.code,
    name: row.name,
    category: { id: row.categoryId, name: row.categoryName },
    defaultExpenseArticle: { id: row.expenseArticleId, code: row.expenseArticleCode, name: row.expenseArticleName },
    defaultPurpose: { id: row.purposeId, code: row.purposeCode, name: row.purposeName },
    reportUnit: { id: row.reportUnitId, name: row.reportUnitName },
    qtyBase: toDecimalString(row.qtyBase) ?? '0',
    qtyReport: toDecimalString(row.qtyReport) ?? '0',
    minQtyBase: toDecimalString(row.minQtyBase),
    status: row.status,
    isNegative: row.isNegative,
    isActive: row.isActive,
    ...(row.factorFallback ? { dataWarning: 'REPORT_FACTOR_FALLBACK' as const } : {}),
  };
}

export async function getStockList(rawQuery: StockListQuery): Promise<StockListResponse> {
  const query = { ...rawQuery, status: rawQuery.status ?? 'all', active: rawQuery.active ?? 'true', limit: rawQuery.limit ?? 50, offset: rawQuery.offset ?? 0 };
  const filters = buildFilters(query);

  const [rows, totalRows] = await Promise.all([
    prisma.$queryRaw<StockRow[]>(Prisma.sql`
      ${baseCte(filters)}
      SELECT
        stock.*,
        (stock."qtyBase" / NULLIF(stock."reportFactorToBase", 0))::numeric AS "qtyReport",
        CASE
          WHEN stock."qtyBase" = 0 THEN 'ZERO'
          WHEN stock."minQtyBase" IS NOT NULL AND stock."qtyBase" < stock."minQtyBase" THEN 'BELOW_MIN'
          ELSE 'OK'
        END AS status,
        (stock."qtyBase" < 0) AS "isNegative"
      FROM stock
      ORDER BY stock.code ASC
      LIMIT ${query.limit}
      OFFSET ${query.offset}
    `),
    prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`${baseCte(filters)} SELECT COUNT(*)::bigint AS total FROM stock`),
  ]);

  return { items: rows.map(mapRow), total: Number(totalRows[0]?.total ?? 0) };
}

export async function getStockSnapshotByItemId(itemId: string): Promise<StockItemSnapshot | null> {
  const rows = await prisma.$queryRaw<StockRow[]>(Prisma.sql`
    ${baseCte(Prisma.sql`AND i.id = ${itemId}::uuid`)}
    SELECT
      stock.*,
      (stock."qtyBase" / NULLIF(stock."reportFactorToBase", 0))::numeric AS "qtyReport",
      CASE
        WHEN stock."qtyBase" = 0 THEN 'ZERO'
        WHEN stock."minQtyBase" IS NOT NULL AND stock."qtyBase" < stock."minQtyBase" THEN 'BELOW_MIN'
        ELSE 'OK'
      END AS status,
      (stock."qtyBase" < 0) AS "isNegative"
    FROM stock
    LIMIT 1
  `);

  const row = rows[0];
  if (!row) return null;

  return {
    qtyBase: toDecimalString(row.qtyBase) ?? '0',
    qtyReport: toDecimalString(row.qtyReport) ?? '0',
    minQtyBase: toDecimalString(row.minQtyBase),
    reportFactorToBase: toDecimalString(row.reportFactorToBase) ?? '1',
    status: row.status,
    isNegative: row.isNegative,
    ...(row.factorFallback ? { dataWarning: 'REPORT_FACTOR_FALLBACK' as const } : {}),
  };
}
