import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';

import { getSessionFromRequestCookies } from '@/lib/auth/session';

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getSessionFromRequestCookies();
  if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (session.user.role !== Role.ADMIN) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  return null;
}

export async function GET(): Promise<NextResponse> {
  const authError = await requireAdmin();
  if (authError) return authError;

  return NextResponse.json({
    hasBotToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    appUrl: process.env.APP_URL ?? null,
  });
}
