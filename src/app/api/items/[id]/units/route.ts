import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { COMPAT_ROUTE_HEADERS } from '@/app/api/accounting-positions/shared';
import { safeServerErrorResponse } from '@/lib/api/errors';
import { requireAuthenticatedApiUser, requireManagerOrAdminApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { putItemUnitsSchema } from '@/lib/items/validators';

function responseHeaders(request: Request): HeadersInit | undefined {
  return new URL(request.url).pathname.includes('/api/items/') ? COMPAT_ROUTE_HEADERS : undefined;
}

export async function GET(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const { error } = await requireAuthenticatedApiUser();
  if (error) return error;

  const units = await prisma.accountingPositionUnit.findMany({
    where: { itemId: params.id, isAllowed: true },
    include: { unit: { select: { id: true, name: true, isActive: true } } },
    orderBy: { unit: { name: 'asc' } },
  });

  return NextResponse.json({ units }, { headers: responseHeaders(request) });
}

export async function PUT(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const authError = await requireManagerOrAdminApi();
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400, headers: responseHeaders(request) });
    const data = putItemUnitsSchema.parse(body);
    const item = await prisma.accountingPosition.findUnique({ where: { id: params.id }, select: { baseUnitId: true } });
    if (!item) return NextResponse.json({ error: 'Позиция не найдена' }, { status: 404, headers: responseHeaders(request) });

    const unitIds = [...new Set(data.units.map((unit) => unit.unitId))];
    if (unitIds.length !== data.units.length) {
      return NextResponse.json({ error: 'Единицы не должны повторяться' }, { status: 400, headers: responseHeaders(request) });
    }

    const validUnits = await prisma.unit.findMany({ where: { id: { in: unitIds } }, select: { id: true } });
    if (validUnits.length !== unitIds.length) {
      return NextResponse.json({ error: 'Одна или несколько единиц не существуют' }, { status: 400, headers: responseHeaders(request) });
    }

    const allowedUnits = data.units.filter((unit) => unit.isAllowed);
    const defaultInputs = allowedUnits.filter((unit) => unit.isDefaultInput);
    const defaultReports = allowedUnits.filter((unit) => unit.isDefaultReport);

    if (defaultInputs.length !== 1) {
      return NextResponse.json({ error: 'Среди разрешённых единиц должна быть ровно одна единица ввода по умолчанию' }, { status: 400, headers: responseHeaders(request) });
    }
    if (defaultReports.length !== 1) {
      return NextResponse.json({ error: 'Среди разрешённых единиц должна быть ровно одна единица отчётности по умолчанию' }, { status: 400, headers: responseHeaders(request) });
    }

    const baseUnit = data.units.find((unit) => unit.unitId === item.baseUnitId);
    if (!baseUnit) {
      return NextResponse.json({ error: 'Базовая единица должна присутствовать в списке единиц' }, { status: 400, headers: responseHeaders(request) });
    }
    if (Number(baseUnit.factorToBase) !== 1) {
      return NextResponse.json({ error: 'Для базовой единицы коэффициент должен быть равен 1' }, { status: 400, headers: responseHeaders(request) });
    }

    await prisma.$transaction(async (tx) => {
      await tx.accountingPositionUnit.deleteMany({ where: { itemId: params.id } });
      await tx.accountingPositionUnit.createMany({
        data: data.units.map((unit) => ({
          itemId: params.id,
          unitId: unit.unitId,
          factorToBase: unit.factorToBase,
          isAllowed: unit.isAllowed,
          isDefaultInput: unit.isDefaultInput,
          isDefaultReport: unit.isDefaultReport,
        })),
      });

      await tx.accountingPosition.update({
        where: { id: params.id },
        data: {
          defaultInputUnitId: defaultInputs[0].unitId,
          reportUnitId: defaultReports[0].unitId,
        },
      });
    });

    return NextResponse.json({ ok: true }, { headers: responseHeaders(request) });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Некорректные данные' }, { status: 400, headers: responseHeaders(request) });
    return safeServerErrorResponse(error, 'Ошибка сохранения единиц');
  }
}
