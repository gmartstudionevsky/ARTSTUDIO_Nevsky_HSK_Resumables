import { Prisma, RecordStatus, TxType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  qtyInput: z.union([z.string(), z.number()]).transform((value) => Number(value)),
  unitId: z.string().uuid(),
  expenseArticleId: z.string().uuid().nullable().optional(),
  purposeId: z.string().uuid().nullable().optional(),
  comment: z.string().trim().nullable().optional(),
  reasonId: z.string().uuid().nullable().optional(),
  cancelNote: z.string().trim().nullable().optional(),
});

function makeBatchId(): string {
  const date = new Date();
  return `BAT-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

export async function POST(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const { user, error } = await requireSupervisorOrAboveApi();
  if (error || !user) return error ?? NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
    const data = schema.parse(body);
    if (data.qtyInput <= 0) return NextResponse.json({ error: 'Количество должно быть больше нуля' }, { status: 400 });

    const oldLine = await prisma.transactionLine.findUnique({
      where: { id: params.id },
      include: {
        transaction: true,
        item: { select: { id: true, defaultExpenseArticleId: true, defaultPurposeId: true } },
      },
    });
    if (!oldLine) return NextResponse.json({ error: 'Строка не найдена' }, { status: 404 });
    if (oldLine.status === RecordStatus.CANCELLED) return NextResponse.json({ error: 'Строка уже отменена' }, { status: 400 });
    if (oldLine.transaction.type !== TxType.IN && oldLine.transaction.type !== TxType.OUT && oldLine.transaction.type !== TxType.ADJUST) return NextResponse.json({ error: 'Исправление для этого типа недоступно' }, { status: 400 });

    const itemUnit = await prisma.itemUnit.findFirst({ where: { itemId: oldLine.itemId, unitId: data.unitId, isAllowed: true } });
    if (!itemUnit) return NextResponse.json({ error: 'Единица не разрешена для позиции' }, { status: 400 });
    const qtyBase = new Prisma.Decimal(data.qtyInput).mul(itemUnit.factorToBase);

    const created = await prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.transactionLine.update({
        where: { id: oldLine.id },
        data: {
          status: RecordStatus.CANCELLED,
          cancelledAt: now,
          cancelledById: user.id,
          reasonId: data.reasonId ?? null,
          cancelNote: `Исправление: ${data.cancelNote || 'авто'}`,
        },
      });

      const newTx = await tx.transaction.create({
        data: {
          batchId: makeBatchId(),
          type: oldLine.transaction.type,
          occurredAt: oldLine.transaction.occurredAt,
          createdById: user.id,
          note: `Исправление строки ${oldLine.id} (из batch ${oldLine.transaction.batchId})`,
          status: RecordStatus.ACTIVE,
        },
      });

      const newLine = await tx.transactionLine.create({
        data: {
          transactionId: newTx.id,
          itemId: oldLine.itemId,
          qtyInput: new Prisma.Decimal(data.qtyInput),
          unitId: data.unitId,
          qtyBase,
          expenseArticleId: data.expenseArticleId ?? oldLine.item.defaultExpenseArticleId,
          purposeId: data.purposeId ?? oldLine.item.defaultPurposeId,
          comment: data.comment ?? null,
          correctedFromLineId: oldLine.id,
          status: RecordStatus.ACTIVE,
        },
        include: {
          item: { select: { id: true, code: true, name: true } },
          unit: { select: { id: true, name: true } },
          expenseArticle: { select: { id: true, code: true, name: true } },
          purpose: { select: { id: true, code: true, name: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'CORRECT_TX_LINE',
          entity: 'TransactionLine',
          entityId: oldLine.id,
          payload: { oldLineId: oldLine.id, newTransactionId: newTx.id, newLineId: newLine.id },
        },
      });

      return { tx: newTx, line: newLine };
    });

    return NextResponse.json({ transaction: { id: created.tx.id, batchId: created.tx.batchId, type: created.tx.type, occurredAt: created.tx.occurredAt }, line: created.line, correctedFromLineId: oldLine.id });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка сервера' }, { status: 500 });
  }
}
