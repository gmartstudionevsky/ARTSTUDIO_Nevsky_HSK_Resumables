import { InventoryStatus, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { patchInventoryLinesSchema } from '@/lib/inventory/validators';

export async function PATCH(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const { error } = await requireSupervisorOrAboveApi();
  if (error) return error;

  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
    const data = patchInventoryLinesSchema.parse(body);

    const session = await prisma.inventorySession.findUnique({ where: { id: params.id } });
    if (!session) return NextResponse.json({ error: 'Инвентаризация не найдена' }, { status: 404 });
    if (session.status !== InventoryStatus.DRAFT) return NextResponse.json({ error: 'Редактирование доступно только для черновика' }, { status: 409 });

    await prisma.$transaction(async (tx) => {
      for (const update of data.updates) {
        const line = await tx.inventoryLine.findUnique({ where: { id: update.lineId }, include: { item: { select: { id: true } } } });
        if (!line || line.sessionId !== params.id) throw new Error('LINE_NOT_FOUND');

        const nextUnitId = update.unitId === undefined ? line.unitId : update.unitId;
        let factor = new Prisma.Decimal(1);

        if (nextUnitId) {
          const itemUnit = await tx.accountingPositionUnit.findUnique({ where: { itemId_unitId: { itemId: line.item.id, unitId: nextUnitId } } });
          if (!itemUnit || !itemUnit.isAllowed) throw new Error('UNIT_NOT_ALLOWED');
          factor = itemUnit.factorToBase;
        }

        const nextQtyInput = update.qtyFactInput === undefined ? line.qtyFactInput : update.qtyFactInput === null ? null : new Prisma.Decimal(update.qtyFactInput);
        const qtyFactBase = nextQtyInput === null ? null : nextQtyInput.mul(factor);
        const deltaBase = qtyFactBase === null ? null : qtyFactBase.sub(line.qtySystemBase);

        await tx.inventoryLine.update({
          where: { id: line.id },
          data: {
            unitId: nextUnitId ?? line.unitId,
            qtyFactInput: nextQtyInput,
            qtyFactBase,
            deltaBase,
            apply: update.apply ?? line.apply,
            comment: update.comment === undefined ? line.comment : update.comment,
          },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    if (error instanceof Error && error.message === 'UNIT_NOT_ALLOWED') return NextResponse.json({ error: 'Единица не разрешена для позиции' }, { status: 400 });
    if (error instanceof Error && error.message === 'LINE_NOT_FOUND') return NextResponse.json({ error: 'Строка не найдена' }, { status: 404 });
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
