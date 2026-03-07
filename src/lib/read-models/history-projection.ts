import { Prisma, RecordStatus, TxType } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { HistoryListResponse, HistoryQuery } from '@/lib/history/types';

type TxListRow = {
  id: string;
  batchId: string;
  type: TxType;
  occurredAt: Date;
  createdAt: Date;
  createdById: string;
  createdByLogin: string;
  note: string | null;
  status: RecordStatus;
  linesTotal: bigint;
  linesActive: bigint;
  linesCancelled: bigint;
};


export function mapHistoryProjectionRow(row: TxListRow) {
  const linesTotal = Number(row.linesTotal);
  const linesActive = Number(row.linesActive);
  const linesCancelled = Number(row.linesCancelled);
  const uiStatus = linesActive === 0 ? 'CANCELLED' : linesCancelled > 0 ? 'PARTIAL' : 'ACTIVE';
  const eventClass = row.type === 'OPENING' ? 'opening' : row.type === 'INVENTORY_APPLY' ? 'inventory_apply' : 'movement';

  return {
    id: row.id,
    batchId: row.batchId,
    type: row.type,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    createdBy: { id: row.createdById, login: row.createdByLogin },
    note: row.note,
    status: row.status,
    linesTotal,
    linesActive,
    linesCancelled,
    uiStatus,
    eventClass,
  };
}
export async function getHistoryProjection(query: Required<Pick<HistoryQuery, 'type' | 'status' | 'limit' | 'offset'>> & HistoryQuery): Promise<HistoryListResponse> {
  const filters: Prisma.Sql[] = [];
  if (query.from) filters.push(Prisma.sql`tx."occurredAt" >= ${new Date(query.from)}`);
  if (query.to) filters.push(Prisma.sql`tx."occurredAt" <= ${new Date(query.to)}`);
  if (query.type !== 'all') filters.push(Prisma.sql`tx.type = ${query.type}::"TxType"`);
  if (query.status === 'active') filters.push(Prisma.sql`tx.status = 'ACTIVE'::"RecordStatus"`);
  if (query.status === 'cancelled') filters.push(Prisma.sql`tx.status = 'CANCELLED'::"RecordStatus"`);
  if (query.itemId) filters.push(Prisma.sql`EXISTS (SELECT 1 FROM "TransactionLine" tl WHERE tl."transactionId" = tx.id AND tl."itemId" = ${query.itemId}::uuid)`);
  if (query.expenseArticleId) filters.push(Prisma.sql`EXISTS (SELECT 1 FROM "TransactionLine" tl WHERE tl."transactionId" = tx.id AND tl."expenseArticleId" = ${query.expenseArticleId}::uuid)`);
  if (query.purposeId) filters.push(Prisma.sql`EXISTS (SELECT 1 FROM "TransactionLine" tl WHERE tl."transactionId" = tx.id AND tl."purposeId" = ${query.purposeId}::uuid)`);
  if (query.categoryId) filters.push(Prisma.sql`EXISTS (SELECT 1 FROM "TransactionLine" tl JOIN "Item" i ON i.id = tl."itemId" WHERE tl."transactionId" = tx.id AND i."categoryId" = ${query.categoryId}::uuid)`);
  if (query.q) {
    const pattern = `%${query.q}%`;
    filters.push(Prisma.sql`(
      tx."batchId" ILIKE ${pattern}
      OR u.login ILIKE ${pattern}
      OR EXISTS (
        SELECT 1
        FROM "TransactionLine" tlq
        JOIN "Item" iq ON iq.id = tlq."itemId"
        WHERE tlq."transactionId" = tx.id AND (iq.name ILIKE ${pattern} OR iq.code ILIKE ${pattern})
      )
    )`);
  }

  const whereSql = filters.length > 0 ? Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}` : Prisma.sql``;

  const [items, totalRows] = await Promise.all([
    prisma.$queryRaw<TxListRow[]>(Prisma.sql`
      WITH filtered_tx AS (
        SELECT tx.id
        FROM "Transaction" tx
        JOIN "User" u ON u.id = tx."createdById"
        ${whereSql}
        ORDER BY tx."occurredAt" DESC, tx."createdAt" DESC
        LIMIT ${query.limit}
        OFFSET ${query.offset}
      )
      SELECT
        tx.id,
        tx."batchId",
        tx.type,
        tx."occurredAt",
        tx."createdAt",
        tx."createdById",
        u.login AS "createdByLogin",
        tx.note,
        tx.status,
        COUNT(tl.id)::bigint AS "linesTotal",
        COALESCE(SUM(CASE WHEN tl.status = 'ACTIVE' THEN 1 ELSE 0 END), 0)::bigint AS "linesActive",
        COALESCE(SUM(CASE WHEN tl.status = 'CANCELLED' THEN 1 ELSE 0 END), 0)::bigint AS "linesCancelled"
      FROM filtered_tx f
      JOIN "Transaction" tx ON tx.id = f.id
      JOIN "User" u ON u.id = tx."createdById"
      LEFT JOIN "TransactionLine" tl ON tl."transactionId" = tx.id
      GROUP BY tx.id, u.id
      ORDER BY tx."occurredAt" DESC, tx."createdAt" DESC
    `),
    prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COUNT(DISTINCT tx.id)::bigint AS total
      FROM "Transaction" tx
      JOIN "User" u ON u.id = tx."createdById"
      ${whereSql}
    `),
  ]);

  return {
    items: items.map(mapHistoryProjectionRow),
    total: Number(totalRows[0]?.total ?? 0),
  } as HistoryListResponse;
}
