import { TxType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createAccountingEventWriteService } from '@/lib/application/accounting-event';
import { requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { getHistoryProjection, registerProjectionUpdate } from '@/lib/read-models';
import { isDateLocked } from '@/lib/period-locks/service';
import { getSettings } from '@/lib/settings/service';
import { sendTxCreated } from '@/lib/telegram/service';

const accountingEventWriteService = createAccountingEventWriteService();

const numberInputSchema = z.union([z.string(), z.number()]).transform((value) => Number(value));

const createSchema = z.object({
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

const isIsoDate = (value: string): boolean => !Number.isNaN(Date.parse(value));

const listSchema = z.object({
  from: z.string().optional().refine((value) => !value || isIsoDate(value), { message: 'Некорректный from' }),
  to: z.string().optional().refine((value) => !value || isIsoDate(value), { message: 'Некорректный to' }),
  type: z.enum(['IN', 'OUT', 'ADJUST', 'OPENING', 'INVENTORY_APPLY', 'all']).optional().default('all'),
  status: z.enum(['active', 'cancelled', 'all']).optional().default('all'),
  q: z.string().trim().optional(),
  itemId: z.string().uuid().optional(),
  expenseArticleId: z.string().uuid().optional(),
  purposeId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export async function GET(request: Request): Promise<NextResponse> {
  const { error } = await requireSupervisorOrAboveApi();
  if (error) return error;

  try {
    const query = listSchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const payload = await getHistoryProjection(query);
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Некорректные параметры запроса' }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const { user, error } = await requireSupervisorOrAboveApi();
  if (error || !user) return error ?? NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
    const data = createSchema.parse(body);
    const settings = await getSettings(prisma);

    const occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date();
    if (user.role === 'SUPERVISOR') {
      const minDate = new Date();
      minDate.setDate(minDate.getDate() - settings.supervisorBackdateDays);
      if (occurredAt < minDate) {
        return NextResponse.json({ error: `Супервайзеру доступен ввод задним числом только на ${settings.supervisorBackdateDays} дней.` }, { status: 403 });
      }
    }

    const locked = await isDateLocked(occurredAt, prisma);
    if (locked && user.role !== 'ADMIN') {
      return NextResponse.json({ error: `Период закрыт. Операции за ${occurredAt.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })} запрещены.` }, { status: 403 });
    }

    const txResult = await accountingEventWriteService.createMovement({
      movementType: data.type as 'IN' | 'OUT' | 'ADJUST',
      occurredAt: occurredAt.toISOString(),
      note: data.note ?? null,
      intakeMode: data.intakeMode,
      headerPurposeId: data.headerPurposeId,
      lines: data.lines,
      context: {
        actorId: user.id,
        actorRole: user.role,
        entryPoint: 'api',
        correlationId: request.headers.get('x-correlation-id') ?? undefined,
      },
    });

    if (!txResult.ok) {
      const status = txResult.kind === 'unexpected' ? 500 : txResult.kind === 'not_found' ? 404 : txResult.kind === 'conflict' ? 409 : 400;
      return NextResponse.json({ error: txResult.message, scenario: txResult.scenario, details: txResult.details }, { status });
    }

    registerProjectionUpdate(txResult.data.projection);

    const lines = await prisma.transactionLine.findMany({
      where: { transactionId: txResult.data.transaction.id },
      include: {
        item: { select: { id: true, code: true, name: true } },
        unit: { select: { id: true, name: true } },
        expenseArticle: { select: { id: true, code: true, name: true } },
        purpose: { select: { id: true, code: true, name: true } },
      },
      orderBy: { id: 'asc' },
    });

    try {
      void sendTxCreated(txResult.data.transaction.id);
    } catch (telegramError) {
      console.error('[telegram] tx notification enqueue failed', telegramError);
    }

    return NextResponse.json({
      transaction: txResult.data.transaction,
      lines,
      projection: txResult.data.projection,
      recovery: txResult.data.recovery,
      ...(txResult.data.warnings?.length ? { warnings: txResult.data.warnings } : {}),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Некорректные данные операции' }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка сервера' }, { status: 500 });
  }
}
