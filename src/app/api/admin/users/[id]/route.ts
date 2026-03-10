import { Prisma, Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getSessionFromRequestCookies } from '@/lib/auth/session';
import { patchUserSchema, updateAdminUserById } from '@/lib/admin/users';

const paramsSchema = z.object({ id: z.string().uuid() });

async function requireAdmin(): Promise<{ id: string } | NextResponse> {
  const session = await getSessionFromRequestCookies();

  if (!session) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  }

  return { id: session.user.id };
}

export async function PATCH(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: 'Некорректный идентификатор пользователя' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = patchUserSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
  }

  if (parsedBody.data.isActive === false && parsedParams.data.id === admin.id) {
    return NextResponse.json({ error: 'Нельзя деактивировать текущего пользователя' }, { status: 400 });
  }

  try {
    const user = await updateAdminUserById(parsedParams.data.id, parsedBody.data);
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
