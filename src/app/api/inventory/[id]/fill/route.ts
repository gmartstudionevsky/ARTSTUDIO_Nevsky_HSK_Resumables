import { InventoryStatus, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { fillInventorySchema } from '@/lib/inventory/validators';
import { getStockQtyBaseByItemIds } from '@/lib/stock/calc';

export async function POST(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const { error } = await requireSupervisorOrAboveApi();
  if (error) return error;

  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
    const data = fillInventorySchema.parse(body);

    const session = await prisma.inventorySession.findUnique({ where: { id: params.id }, include: { _count: { select: { lines: true } } } });
    if (!session) return NextResponse.json({ error: 'Инвентаризация не найдена' }, { status: 404 });
    if (session.status !== InventoryStatus.DRAFT) return NextResponse.json({ error: 'Инвентаризация уже применена' }, { status: 409 });
    if (session._count.lines > 0) return NextResponse.json({ error: 'Строки уже сформированы' }, { status: 409 });

    const where: Prisma.AccountingPositionWhereInput = { isActive: true };
    if (data.scope === 'CATEGORY') where.categoryId = data.categoryId;
    if (data.scope === 'ITEMS') where.id = { in: data.itemIds };

    const items = await prisma.accountingPosition.findMany({ where, select: { id: true, defaultInputUnitId: true } });
    if (items.length === 0) return NextResponse.json({ ok: true, count: 0 });

    const stockByItemId = await getStockQtyBaseByItemIds(items.map((item) => item.id));

    await prisma.inventoryLine.createMany({
      data: items.map((item) => ({
        sessionId: session.id,
        itemId: item.id,
        unitId: item.defaultInputUnitId,
        qtySystemBase: stockByItemId.get(item.id) ?? new Prisma.Decimal(0),
        qtyFactInput: null,
        qtyFactBase: null,
        deltaBase: null,
        apply: false,
      })),
    });

    return NextResponse.json({ ok: true, count: items.length });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
