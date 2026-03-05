import { NextResponse } from 'next/server';

import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as { login?: string; password?: string } | null;

  if (!body?.login || !body.password) {
    return NextResponse.json({ error: 'Логин и пароль обязательны' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { login: body.login } });

  if (!user) {
    return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 });
  }

  const isValidPassword = await verifyPassword(user.passwordHash, body.password);

  if (!isValidPassword) {
    return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 });
  }

  if (!user.isActive) {
    return NextResponse.json({ error: 'Пользователь деактивирован' }, { status: 403 });
  }

  await createSession(user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return NextResponse.json({ ok: true, mustChangePassword: user.forcePasswordChange, role: user.role });
}
