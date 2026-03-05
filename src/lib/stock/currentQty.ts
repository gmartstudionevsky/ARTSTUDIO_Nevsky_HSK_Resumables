import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

export async function getCurrentQtyBaseByItemIds(itemIds: string[]): Promise<Map<string, Prisma.Decimal>> {
  if (itemIds.length === 0) return new Map();

  const rows = await prisma.$queryRaw<Array<{ itemId: string; qtyBase: Prisma.Decimal }>>(Prisma.sql`
    SELECT
      tl."itemId" as "itemId",
      COALESCE(SUM(CASE
        WHEN tx.type IN ('IN', 'OPENING', 'ADJUST', 'INVENTORY_APPLY') THEN tl."qtyBase"
        WHEN tx.type = 'OUT' THEN -tl."qtyBase"
        ELSE 0
      END), 0)::numeric as "qtyBase"
    FROM "TransactionLine" tl
    JOIN "Transaction" tx ON tx.id = tl."transactionId"
    WHERE tl.status = 'ACTIVE' AND tl."itemId" IN (${Prisma.join(itemIds.map((id) => Prisma.sql`${id}::uuid`))})
    GROUP BY tl."itemId"
  `);

  const map = new Map<string, Prisma.Decimal>();
  rows.forEach((row) => map.set(row.itemId, row.qtyBase));
  return map;
}
