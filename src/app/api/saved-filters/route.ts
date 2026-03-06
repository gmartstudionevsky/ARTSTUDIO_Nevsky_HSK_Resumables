import { Prisma, SavedFilterKind } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';

const querySchema = z.object({
  kind: z.enum(['history', 'stock']).transform((value) => (value === 'history' ? SavedFilterKind.HISTORY : SavedFilterKind.STOCK)),
});

const createSchema = z.object({
  kind: z.nativeEnum(SavedFilterKind),
  name: z.string().trim().min(1).max(60),
  payload: z.record(z.any()),
  isDefault: z.boolean().optional().default(false),
});

export async function GET(request: Request): Promise<NextResponse> {
  const { user, error } = await requireSupervisorOrAboveApi();
  if (error || !user) return error ?? NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  try {
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const [items, total] = await Promise.all([
      prisma.savedFilter.findMany({
        where: { userId: user.id, kind: query.kind },
        select: { id: true, name: true, isDefault: true, payload: true, updatedAt: true },
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
      }),
      prisma.savedFilter.count({ where: { userId: user.id, kind: query.kind } }),
    ]);
    return NextResponse.json({ items, total });
  } catch {
    return NextResponse.json({ error: 'Некорректные параметры' }, { status: 400 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const { user, error } = await requireSupervisorOrAboveApi();
  if (error || !user) return error ?? NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  try {
    const body = createSchema.parse(await request.json());

    const item = await prisma.$transaction(async (tx) => {
      if (body.isDefault) {
        await tx.savedFilter.updateMany({
          where: { userId: user.id, kind: body.kind, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.savedFilter.create({
        data: { userId: user.id, kind: body.kind, name: body.name, payload: body.payload as Prisma.InputJsonValue, isDefault: body.isDefault },
        select: { id: true, name: true, isDefault: true, payload: true, updatedAt: true },
      });
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Фильтр с таким именем уже существует' }, { status: 409 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
