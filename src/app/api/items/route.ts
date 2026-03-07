import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { createAccountingPositionWriteService } from '@/lib/application/accounting-position';
import { requireAuthenticatedApiUser, requireManagerOrAdminApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { mapItemRecordToAccountingPosition } from '@/lib/domain/accounting-position';
import { toPositionCatalogEntry } from '@/lib/domain/position-catalog';
import { createItemSchema, listItemsQuerySchema } from '@/lib/items/validators';

function isUniqueCodeError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

const accountingPositionWriteService = createAccountingPositionWriteService();

function toHttpStatus(kind: 'validation' | 'invariant' | 'not_found' | 'conflict' | 'unexpected'): number {
  if (kind === 'validation' || kind === 'invariant') return 400;
  if (kind === 'not_found') return 404;
  if (kind === 'conflict') return 409;
  return 500;
}

export async function GET(request: Request): Promise<NextResponse> {
  const { error } = await requireAuthenticatedApiUser();
  if (error) return error;

  try {
    const query = listItemsQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const activeFilter = query.active === 'all' ? undefined : query.active === 'true';
    const q = query.q?.trim();

    const where: Prisma.ItemWhereInput = {
      ...(activeFilter === undefined ? {} : { isActive: activeFilter }),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.expenseArticleId ? { defaultExpenseArticleId: query.expenseArticleId } : {}),
      ...(query.purposeId ? { defaultPurposeId: query.purposeId } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
              { synonyms: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
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
        orderBy: [{ updatedAt: 'desc' }],
        take: query.limit,
        skip: query.offset,
      }),
      prisma.item.count({ where }),
    ]);

    const accountingPositions = items.map((item) => mapItemRecordToAccountingPosition(item));
    const catalogEntries = accountingPositions.map(toPositionCatalogEntry);

    return NextResponse.json({
      items: catalogEntries,
      total,
      catalogPositions: catalogEntries,
    });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Некорректные параметры запроса' }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const authError = await requireManagerOrAdminApi();
  if (authError) return authError;
  const { user } = await requireAuthenticatedApiUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
    const data = createItemSchema.parse(body);
    const result = await accountingPositionWriteService.create({
      ...data,
      context: {
        actorId: user.id,
        entryPoint: 'api',
        correlationId: request.headers.get('x-correlation-id') ?? undefined,
      },
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message, scenario: result.scenario }, { status: toHttpStatus(result.kind) });
    }

    return NextResponse.json({
      item: result.data.item,
      transactionId: result.data.transactionId,
      accountingPosition: result.data.accountingPosition,
    });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? 'Некорректные данные' }, { status: 400 });
    if (isUniqueCodeError(error)) return NextResponse.json({ error: 'Позиция с таким кодом уже существует' }, { status: 409 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка сервера' }, { status: 500 });
  }
}
