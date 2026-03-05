import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { requireAuthenticatedApiUser, requireManagerOrAdminApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { generateNextItemCode } from '@/lib/items/codeGen';
import { createItemSchema, listItemsQuerySchema } from '@/lib/items/validators';

function isUniqueCodeError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
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
          defaultExpenseArticle: { select: { id: true, code: true, name: true } },
          defaultPurpose: { select: { id: true, code: true, name: true } },
        },
        orderBy: [{ updatedAt: 'desc' }],
        take: query.limit,
        skip: query.offset,
      }),
      prisma.item.count({ where }),
    ]);

    return NextResponse.json({ items, total });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Некорректные параметры запроса' }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const authError = await requireManagerOrAdminApi();
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
    const data = createItemSchema.parse(body);

    const item = await prisma.$transaction(async (tx) => {
      const code = data.code ?? (await generateNextItemCode(tx));
      const created = await tx.item.create({
        data: {
          code,
          name: data.name,
          categoryId: data.categoryId,
          defaultExpenseArticleId: data.defaultExpenseArticleId,
          defaultPurposeId: data.defaultPurposeId,
          baseUnitId: data.baseUnitId,
          defaultInputUnitId: data.defaultInputUnitId,
          reportUnitId: data.reportUnitId,
          minQtyBase: data.minQtyBase,
          synonyms: data.synonyms,
          note: data.note,
          isActive: data.isActive,
        },
      });

      await tx.itemUnit.create({
        data: {
          itemId: created.id,
          unitId: data.baseUnitId,
          factorToBase: 1,
          isAllowed: true,
          isDefaultInput: data.defaultInputUnitId === data.baseUnitId,
          isDefaultReport: data.reportUnitId === data.baseUnitId,
        },
      });

      return created;
    });

    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    if (isUniqueCodeError(error)) return NextResponse.json({ error: 'Позиция с таким кодом уже существует' }, { status: 409 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка сервера' }, { status: 500 });
  }
}
