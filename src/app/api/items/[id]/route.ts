import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { requireManagerOrAdminApi, requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { mapItemRecordToAccountingPosition } from '@/lib/domain/accounting-position';
import { patchItemSchema } from '@/lib/items/validators';

export async function GET(_: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const { error } = await requireSupervisorOrAboveApi();
  if (error) return error;

  const item = await prisma.item.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
      minQtyBase: true,
      synonyms: true,
      note: true,
      category: { select: { id: true, name: true } },
      defaultExpenseArticle: { select: { id: true, code: true, name: true } },
      defaultPurpose: { select: { id: true, code: true, name: true } },
      baseUnit: { select: { id: true, name: true } },
      defaultInputUnit: { select: { id: true, name: true } },
      reportUnit: { select: { id: true, name: true } },
    },
  });

  if (!item) return NextResponse.json({ error: 'Позиция не найдена' }, { status: 404 });

  const accountingPosition = mapItemRecordToAccountingPosition(item);

  return NextResponse.json({
    item: {
      ...item,
      minQtyBase: item.minQtyBase?.toString() ?? null,
    },
    accountingPosition,
  });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const authError = await requireManagerOrAdminApi();
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
    const data = patchItemSchema.parse(body);

    const existingUnits = await prisma.itemUnit.findMany({ where: { itemId: params.id }, select: { unitId: true } });
    if (data.baseUnitId && !existingUnits.some((unit) => unit.unitId === data.baseUnitId)) {
      return NextResponse.json({ error: 'Базовая единица должна присутствовать в списке единиц позиции' }, { status: 400 });
    }

    const item = await prisma.item.update({ where: { id: params.id }, data });
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка сервера' }, { status: 500 });
  }
}
