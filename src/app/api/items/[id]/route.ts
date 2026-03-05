import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { requireManagerOrAdminApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { patchItemSchema } from '@/lib/items/validators';

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
