import { Prisma, Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getSessionFromRequestCookies } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { resetAdminUserPassword, resetPasswordSchema } from '@/lib/admin/users';

const paramsSchema = z.object({ id: z.string().uuid() });

async function requireAdmin(): Promise<{ id: string } | NextResponse> {
  const session = await getSessionFromRequestCookies();

  if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (session.user.role !== Role.ADMIN) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });

  return { id: session.user.id };
}

export async function POST(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) return NextResponse.json({ error: 'Некорректный идентификатор пользователя' }, { status: 400 });

  const body = await request.json().catch(() => null);
  const parsedBody = resetPasswordSchema.safeParse(body ?? {});

  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
  }

  try {
    const tempPassword = await resetAdminUserPassword(parsedParams.data.id, parsedBody.data.tempPassword);

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: 'USER_RESET_PASSWORD',
        entity: 'User',
        entityId: parsedParams.data.id,
        payload: { revokedSessions: true },
      },
    });

    return NextResponse.json({ ok: true, tempPassword });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
