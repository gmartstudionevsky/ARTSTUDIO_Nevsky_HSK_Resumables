import { Role, UiTextScope } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getSessionFromRequestCookies } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

const paramsSchema = z.object({ id: z.string().uuid() });
const updateSchema = z
  .object({
    ruText: z.string().min(1).max(400).optional(),
    scope: z.nativeEnum(UiTextScope).optional(),
  })
  .refine((value) => value.ruText !== undefined || value.scope !== undefined, {
    message: 'Пустое обновление',
  });

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getSessionFromRequestCookies();
  if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (session.user.role !== Role.ADMIN) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  return null;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) return NextResponse.json({ error: 'Некорректный id' }, { status: 400 });

  const body = await request.json().catch(() => null);
  const parsedBody = updateSchema.safeParse(body);
  if (!parsedBody.success) return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });

  try {
    const item = await prisma.uiText.update({
      where: { id: parsedParams.data.id },
      data: parsedBody.data,
    });

    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: 'Запись не найдена' }, { status: 404 });
  }
}
