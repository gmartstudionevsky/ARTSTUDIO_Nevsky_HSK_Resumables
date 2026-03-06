import { InventoryStatus, Prisma, RecordStatus, Role, TxType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { applyInventorySchema } from '@/lib/inventory/validators';
import { isDateLocked } from '@/lib/period-locks/service';

function makeBatchId(): string {
  const date = new Date();
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `BAT-${y}${m}${d}-${rand}`;
}

export async function POST(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const { user, error } = await requireSupervisorOrAboveApi();
  if (error || !user) return error ?? NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (user.role !== Role.MANAGER && user.role !== Role.ADMIN) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });

  try {
    const body = await request.json().catch(() => null);
    const data = applyInventorySchema.parse(body ?? {});

    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.inventorySession.findUnique({
        where: { id: params.id },
        include: {
          lines: {
            where: { apply: true, qtyFactBase: { not: null } },
            include: { item: { select: { baseUnitId: true, defaultExpenseArticleId: true, defaultPurposeId: true } } },
          },
        },
      });

      if (!session) throw new Error('NOT_FOUND');
      if (session.status !== InventoryStatus.DRAFT) throw new Error('WRONG_STATUS');
      const locked = await isDateLocked(new Date(session.occurredAt), prisma);
      if (locked && user.role !== Role.ADMIN) throw new Error('LOCKED');

      const txType = session.mode === 'OPENING' ? TxType.OPENING : TxType.INVENTORY_APPLY;
      const applyLines: Array<{ itemId: string; unitId: string; qtyInput: Prisma.Decimal; qtyBase: Prisma.Decimal; expenseArticleId: string; purposeId: string; comment: string | null }> = [];

      for (const line of session.lines) {
        const systemBase = session.mode === 'OPENING' ? new Prisma.Decimal(0) : line.qtySystemBase;
        const factBase = line.qtyFactBase;
        if (!factBase) continue;

        if (session.mode === 'OPENING') {
          if (factBase.lt(0)) throw new Error('NEGATIVE_OPENING');
          if (factBase.eq(0)) continue;
          applyLines.push({
            itemId: line.itemId,
            unitId: line.unitId,
            qtyInput: line.qtyFactInput ?? factBase,
            qtyBase: factBase,
            expenseArticleId: line.item.defaultExpenseArticleId,
            purposeId: line.item.defaultPurposeId,
            comment: line.comment ?? 'Инвентаризация',
          });
          continue;
        }

        const delta = factBase.sub(systemBase);
        if (delta.eq(0)) continue;

        applyLines.push({
          itemId: line.itemId,
          unitId: line.item.baseUnitId,
          qtyInput: delta,
          qtyBase: delta,
          expenseArticleId: line.item.defaultExpenseArticleId,
          purposeId: line.item.defaultPurposeId,
          comment: line.comment ?? 'Инвентаризация',
        });
      }

      if (applyLines.length === 0) throw new Error('NO_LINES_TO_APPLY');

      const createdTx = await tx.transaction.create({
        data: {
          batchId: makeBatchId(),
          type: txType,
          occurredAt: new Date(session.occurredAt),
          createdById: user.id,
          note: `${session.mode === 'OPENING' ? 'Открытие склада' : `Инвентаризация ${session.id}`}${data.note ? `. ${data.note}` : ''}`,
          reasonId: data.reasonId ?? null,
          status: RecordStatus.ACTIVE,
        },
      });

      await tx.transactionLine.createMany({
        data: applyLines.map((line) => ({
          transactionId: createdTx.id,
          itemId: line.itemId,
          qtyInput: line.qtyInput,
          unitId: line.unitId,
          qtyBase: line.qtyBase,
          expenseArticleId: line.expenseArticleId,
          purposeId: line.purposeId,
          comment: line.comment,
          status: RecordStatus.ACTIVE,
        })),
      });

      await tx.inventorySession.update({ where: { id: session.id }, data: { status: InventoryStatus.APPLIED, appliedAt: new Date(), appliedById: user.id } });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'APPLY_INVENTORY',
          entity: 'InventorySession',
          entityId: session.id,
          payload: { transactionId: createdTx.id, transactionType: txType, appliedLines: applyLines.length },
        },
      });

      return { transactionId: createdTx.id, transactionType: txType, appliedLines: applyLines.length };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    if (error instanceof Error && error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Инвентаризация не найдена' }, { status: 404 });
    if (error instanceof Error && error.message === 'WRONG_STATUS') return NextResponse.json({ error: 'Применение доступно только для черновика' }, { status: 409 });
    if (error instanceof Error && error.message === 'LOCKED') return NextResponse.json({ error: 'Период закрыт. Применение инвентаризации недоступно, обратитесь к администратору.' }, { status: 403 });
    if (error instanceof Error && error.message === 'NEGATIVE_OPENING') return NextResponse.json({ error: 'Для открытия склада факт не может быть отрицательным' }, { status: 400 });
    if (error instanceof Error && error.message === 'NO_LINES_TO_APPLY') return NextResponse.json({ error: 'Нет строк для применения' }, { status: 409 });
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
