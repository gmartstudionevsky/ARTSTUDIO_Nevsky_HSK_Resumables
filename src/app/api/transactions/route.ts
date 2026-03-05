import { Prisma, RecordStatus, TxType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';

const numberInputSchema = z.union([z.string(), z.number()]).transform((value) => Number(value));

const createSchema = z.object({
  type: z.nativeEnum(TxType).refine((value) => value === TxType.IN || value === TxType.OUT || value === TxType.ADJUST, { message: 'Недопустимый тип операции' }),
  occurredAt: z.string().datetime().nullable().optional(),
  note: z.string().trim().nullable().optional(),
  intakeMode: z.enum(['SINGLE_PURPOSE', 'DISTRIBUTE_PURPOSES']).optional(),
  headerPurposeId: z.string().uuid().nullable().optional(),
  lines: z.array(
    z.object({
      itemId: z.string().uuid(),
      qtyInput: numberInputSchema,
      unitId: z.string().uuid(),
      expenseArticleId: z.string().uuid().nullable().optional(),
      purposeId: z.string().uuid().nullable().optional(),
      comment: z.string().trim().nullable().optional(),
      distributions: z.array(z.object({ purposeId: z.string().uuid(), qtyInput: numberInputSchema })).optional(),
    })
  ).min(1),
});

const isIsoDate = (value: string): boolean => !Number.isNaN(Date.parse(value));

const listSchema = z.object({
  from: z.string().optional().refine((value) => !value || isIsoDate(value), { message: 'Некорректный from' }),
  to: z.string().optional().refine((value) => !value || isIsoDate(value), { message: 'Некорректный to' }),
  type: z.enum(['IN', 'OUT', 'ADJUST', 'OPENING', 'INVENTORY_APPLY', 'all']).optional().default('all'),
  status: z.enum(['active', 'cancelled', 'all']).optional().default('all'),
  q: z.string().trim().optional(),
  itemId: z.string().uuid().optional(),
  expenseArticleId: z.string().uuid().optional(),
  purposeId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

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

function makeBatchId(): string {
  const date = new Date();
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `BAT-${y}${m}${d}-${rand}`;
}

function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(6));
}

export async function GET(request: Request): Promise<NextResponse> {
  const { error } = await requireSupervisorOrAboveApi();
  if (error) return error;

  try {
    const query = listSchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));

    const filters: Prisma.Sql[] = [];
    if (query.from) filters.push(Prisma.sql`tx."occurredAt" >= ${new Date(query.from)}`);
    if (query.to) filters.push(Prisma.sql`tx."occurredAt" <= ${new Date(query.to)}`);
    if (query.type !== 'all') filters.push(Prisma.sql`tx.type = ${query.type}::"TxType"`);
    if (query.status === 'active') filters.push(Prisma.sql`tx.status = 'ACTIVE'::"RecordStatus"`);
    if (query.status === 'cancelled') filters.push(Prisma.sql`tx.status = 'CANCELLED'::"RecordStatus"`);
    if (query.itemId) filters.push(Prisma.sql`EXISTS (SELECT 1 FROM "TransactionLine" tl WHERE tl."transactionId" = tx.id AND tl."itemId" = ${query.itemId}::uuid)`);
    if (query.expenseArticleId) filters.push(Prisma.sql`EXISTS (SELECT 1 FROM "TransactionLine" tl WHERE tl."transactionId" = tx.id AND tl."expenseArticleId" = ${query.expenseArticleId}::uuid)`);
    if (query.purposeId) filters.push(Prisma.sql`EXISTS (SELECT 1 FROM "TransactionLine" tl WHERE tl."transactionId" = tx.id AND tl."purposeId" = ${query.purposeId}::uuid)`);
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

    return NextResponse.json({
      items: items.map((row) => {
        const linesTotal = Number(row.linesTotal);
        const linesActive = Number(row.linesActive);
        const linesCancelled = Number(row.linesCancelled);
        const uiStatus = linesActive === 0 ? 'CANCELLED' : linesCancelled > 0 ? 'PARTIAL' : 'ACTIVE';

        return {
          id: row.id,
          batchId: row.batchId,
          type: row.type,
          occurredAt: row.occurredAt,
          createdAt: row.createdAt,
          createdBy: { id: row.createdById, login: row.createdByLogin },
          note: row.note,
          status: row.status,
          linesTotal,
          linesActive,
          linesCancelled,
          uiStatus,
        };
      }),
      total: Number(totalRows[0]?.total ?? 0),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Некорректные параметры запроса' }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const { user, error } = await requireSupervisorOrAboveApi();
  if (error || !user) return error ?? NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
    const data = createSchema.parse(body);

    const occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date();
    const itemIds = [...new Set(data.lines.map((line) => line.itemId))];
    const unitsByItem = await prisma.itemUnit.findMany({
      where: { itemId: { in: itemIds }, isAllowed: true },
      include: { item: { select: { id: true, isActive: true, defaultExpenseArticleId: true, defaultPurposeId: true, name: true, code: true } } },
    });

    const itemMap = new Map<string, { id: string; isActive: boolean; defaultExpenseArticleId: string; defaultPurposeId: string; name: string; code: string }>();
    const unitFactorMap = new Map<string, Prisma.Decimal>();
    for (const row of unitsByItem) {
      itemMap.set(row.item.id, row.item);
      unitFactorMap.set(`${row.itemId}:${row.unitId}`, row.factorToBase);
    }

    const payloadLines: Array<{ itemId: string; qtyInput: Prisma.Decimal; unitId: string; qtyBase: Prisma.Decimal; expenseArticleId: string; purposeId: string; comment: string | null }> = [];

    for (const line of data.lines) {
      if (line.qtyInput <= 0) return NextResponse.json({ error: 'Количество должно быть больше нуля' }, { status: 400 });
      const item = itemMap.get(line.itemId);
      if (!item || !item.isActive) return NextResponse.json({ error: 'Позиция не найдена или неактивна' }, { status: 400 });
      const factor = unitFactorMap.get(`${line.itemId}:${line.unitId}`);
      if (!factor) return NextResponse.json({ error: 'Единица не разрешена для позиции' }, { status: 400 });

      const expenseArticleId = line.expenseArticleId ?? item.defaultExpenseArticleId;
      const basePurposeId = line.purposeId ?? (data.intakeMode === 'SINGLE_PURPOSE' && data.headerPurposeId ? data.headerPurposeId : item.defaultPurposeId);

      if (data.type === TxType.IN && data.intakeMode === 'DISTRIBUTE_PURPOSES') {
        if (!line.distributions || line.distributions.length === 0) {
          return NextResponse.json({ error: 'Добавьте распределение по назначениям' }, { status: 400 });
        }
        const distributionsSum = line.distributions.reduce((acc, entry) => acc + entry.qtyInput, 0);
        if (Math.abs(distributionsSum - line.qtyInput) > 0.0001) {
          return NextResponse.json({ error: 'Сумма распределений должна совпадать с количеством строки' }, { status: 400 });
        }

        for (const dist of line.distributions) {
          if (dist.qtyInput <= 0) return NextResponse.json({ error: 'Количество в распределении должно быть больше нуля' }, { status: 400 });
          payloadLines.push({
            itemId: line.itemId,
            qtyInput: toDecimal(dist.qtyInput),
            unitId: line.unitId,
            qtyBase: toDecimal(new Prisma.Decimal(dist.qtyInput).mul(factor).toNumber()),
            expenseArticleId,
            purposeId: dist.purposeId,
            comment: line.comment ?? null,
          });
        }
      } else {
        payloadLines.push({
          itemId: line.itemId,
          qtyInput: toDecimal(line.qtyInput),
          unitId: line.unitId,
          qtyBase: toDecimal(new Prisma.Decimal(line.qtyInput).mul(factor).toNumber()),
          expenseArticleId,
          purposeId: basePurposeId,
          comment: line.comment ?? null,
        });
      }
    }

    const txResult = await prisma.$transaction(async (tx) => {
      const createdTx = await tx.transaction.create({
        data: {
          batchId: makeBatchId(),
          type: data.type,
          occurredAt,
          createdById: user.id,
          note: data.note ?? null,
          status: RecordStatus.ACTIVE,
        },
      });

      await tx.transactionLine.createMany({
        data: payloadLines.map((line) => ({ ...line, transactionId: createdTx.id, status: RecordStatus.ACTIVE })),
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'CREATE_TX',
          entity: 'Transaction',
          entityId: createdTx.id,
          payload: { type: data.type, batchId: createdTx.batchId, linesCount: payloadLines.length },
        },
      });

      const lines = await tx.transactionLine.findMany({
        where: { transactionId: createdTx.id },
        include: {
          item: { select: { id: true, code: true, name: true } },
          unit: { select: { id: true, name: true } },
          expenseArticle: { select: { id: true, code: true, name: true } },
          purpose: { select: { id: true, code: true, name: true } },
        },
        orderBy: { id: 'asc' },
      });

      return { createdTx, lines };
    });

    return NextResponse.json({ transaction: { id: txResult.createdTx.id, batchId: txResult.createdTx.batchId, type: txResult.createdTx.type, occurredAt: txResult.createdTx.occurredAt }, lines: txResult.lines });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Некорректные данные операции' }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка сервера' }, { status: 500 });
  }
}
