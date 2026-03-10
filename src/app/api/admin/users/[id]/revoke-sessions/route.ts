import { Prisma, Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getSessionFromRequestCookies } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { revokeUserSessions } from '@/lib/admin/users';

const paramsSchema = z.object({ id: z.string().uuid() });

async function requireAdmin(): Promise<{ id: string } | NextResponse> {
  const session = await getSessionFromRequestCookies();

  if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (session.user.role !== Role.ADMIN) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });

  return { id: session.user.id };
}

export async function POST(_request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) return NextResponse.json({ error: 'Некорректный идентификатор пользователя' }, { status: 400 });

  try {
    await prisma.user.findUniqueOrThrow({ where: { id: parsedParams.data.id }, select: { id: true } });

    const revoked = await revokeUserSessions(parsedParams.data.id);

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: 'USER_REVOKE_SESSIONS',
        entity: 'User',
        entityId: parsedParams.data.id,
        payload: { revoked },
      },
    });

    return NextResponse.json({ ok: true, revoked });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
