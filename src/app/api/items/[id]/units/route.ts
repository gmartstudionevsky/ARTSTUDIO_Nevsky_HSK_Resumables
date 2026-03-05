import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { requireAuthenticatedApiUser, requireManagerOrAdminApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { putItemUnitsSchema } from '@/lib/items/validators';

export async function GET(_: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const { error } = await requireAuthenticatedApiUser();
  if (error) return error;

  const units = await prisma.itemUnit.findMany({
    where: { itemId: params.id, isAllowed: true },
    include: { unit: { select: { id: true, name: true, isActive: true } } },
    orderBy: { unit: { name: 'asc' } },
  });

  return NextResponse.json({ units });
}

export async function PUT(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const authError = await requireManagerOrAdminApi();
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
    const data = putItemUnitsSchema.parse(body);
    const item = await prisma.item.findUnique({ where: { id: params.id }, select: { baseUnitId: true } });
    if (!item) return NextResponse.json({ error: 'Позиция не найдена' }, { status: 404 });

    const unitIds = [...new Set(data.units.map((unit) => unit.unitId))];
    if (unitIds.length !== data.units.length) {
      return NextResponse.json({ error: 'Единицы не должны повторяться' }, { status: 400 });
    }

    const validUnits = await prisma.unit.findMany({ where: { id: { in: unitIds } }, select: { id: true } });
    if (validUnits.length !== unitIds.length) {
      return NextResponse.json({ error: 'Одна или несколько единиц не существуют' }, { status: 400 });
    }

    const allowedUnits = data.units.filter((unit) => unit.isAllowed);
    const defaultInputs = allowedUnits.filter((unit) => unit.isDefaultInput);
    const defaultReports = allowedUnits.filter((unit) => unit.isDefaultReport);

    if (defaultInputs.length !== 1) {
      return NextResponse.json({ error: 'Среди разрешённых единиц должна быть ровно одна единица ввода по умолчанию' }, { status: 400 });
    }
    if (defaultReports.length !== 1) {
      return NextResponse.json({ error: 'Среди разрешённых единиц должна быть ровно одна единица отчётности по умолчанию' }, { status: 400 });
    }

    const baseUnit = data.units.find((unit) => unit.unitId === item.baseUnitId);
    if (!baseUnit) {
      return NextResponse.json({ error: 'Базовая единица должна присутствовать в списке единиц' }, { status: 400 });
    }
    if (Number(baseUnit.factorToBase) !== 1) {
      return NextResponse.json({ error: 'Для базовой единицы коэффициент должен быть равен 1' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.itemUnit.deleteMany({ where: { itemId: params.id } });
      await tx.itemUnit.createMany({
        data: data.units.map((unit) => ({
          itemId: params.id,
          unitId: unit.unitId,
          factorToBase: unit.factorToBase,
          isAllowed: unit.isAllowed,
          isDefaultInput: unit.isDefaultInput,
          isDefaultReport: unit.isDefaultReport,
        })),
      });

      await tx.item.update({
        where: { id: params.id },
        data: {
          defaultInputUnitId: defaultInputs[0].unitId,
          reportUnitId: defaultReports[0].unitId,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка сервера' }, { status: 500 });
  }
}
