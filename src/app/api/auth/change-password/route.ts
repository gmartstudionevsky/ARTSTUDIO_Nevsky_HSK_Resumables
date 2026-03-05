import { NextResponse } from 'next/server';

import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { getSessionFromRequestCookies } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

const MIN_PASSWORD_LENGTH = 10;

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getSessionFromRequestCookies();

  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { currentPassword?: string; newPassword?: string } | null;

  if (!body?.currentPassword || !body.newPassword) {
    return NextResponse.json({ error: 'Текущий и новый пароли обязательны' }, { status: 400 });
  }

  if (body.newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов` }, { status: 400 });
  }

  const isCurrentPasswordValid = await verifyPassword(session.user.passwordHash, body.currentPassword);

  if (!isCurrentPasswordValid) {
    return NextResponse.json({ error: 'Неверный текущий пароль' }, { status: 401 });
  }

  const passwordHash = await hashPassword(body.newPassword);

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      passwordHash,
      forcePasswordChange: false,
    },
  });

  return NextResponse.json({ ok: true });
}
