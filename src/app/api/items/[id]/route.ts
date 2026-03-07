import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { createAccountingPositionWriteService } from '@/lib/application/accounting-position';
import { requireManagerOrAdminApi, requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { mapItemRecordToAccountingPosition } from '@/lib/domain/accounting-position';
import { patchItemSchema } from '@/lib/items/validators';

const accountingPositionWriteService = createAccountingPositionWriteService();

function toHttpStatus(kind: 'validation' | 'invariant' | 'not_found' | 'conflict' | 'unexpected'): number {
  if (kind === 'validation' || kind === 'invariant') return 400;
  if (kind === 'not_found') return 404;
  if (kind === 'conflict') return 409;
  return 500;
}

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

    const result = await accountingPositionWriteService.update({
      id: params.id,
      changes: data,
      context: {
        entryPoint: 'api',
        correlationId: request.headers.get('x-correlation-id') ?? undefined,
      },
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message, scenario: result.scenario }, { status: toHttpStatus(result.kind) });
    }

    return NextResponse.json({
      item: result.data.item,
      accountingPosition: result.data.accountingPosition,
    });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка сервера' }, { status: 500 });
  }
}
