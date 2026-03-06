import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';

const patchSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  payload: z.record(z.unknown()).optional(),
  isDefault: z.boolean().optional(),
}).refine((value) => value.name !== undefined || value.payload !== undefined || value.isDefault !== undefined, {
  message: 'Нет данных для обновления',
});

export async function PATCH(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const { user, error } = await requireSupervisorOrAboveApi();
  if (error || !user) return error ?? NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  try {
    const existing = await prisma.savedFilter.findUnique({ where: { id: params.id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Фильтр не найден' }, { status: 404 });
    }

    const body = patchSchema.parse(await request.json());

    const item = await prisma.$transaction(async (tx) => {
      if (body.isDefault === true) {
        await tx.savedFilter.updateMany({
          where: { userId: user.id, kind: existing.kind, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.savedFilter.update({
        where: { id: existing.id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.payload !== undefined ? { payload: body.payload as Prisma.InputJsonValue } : {}),
          ...(body.isDefault !== undefined ? { isDefault: body.isDefault } : {}),
        },
        select: { id: true, name: true, isDefault: true, payload: true, updatedAt: true },
      });
    });

    return NextResponse.json({ item });
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

export async function DELETE(_request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const { user, error } = await requireSupervisorOrAboveApi();
  if (error || !user) return error ?? NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const existing = await prisma.savedFilter.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: 'Фильтр не найден' }, { status: 404 });
  }

  await prisma.savedFilter.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
