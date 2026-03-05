import { Prisma, RecordStatus, TxType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';

const numberInputSchema = z.union([z.string(), z.number()]).transform((value) => Number(value));

const schema = z.object({
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

export async function POST(request: Request): Promise<NextResponse> {
  const { user, error } = await requireSupervisorOrAboveApi();
  if (error || !user) return error ?? NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
    const data = schema.parse(body);

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
