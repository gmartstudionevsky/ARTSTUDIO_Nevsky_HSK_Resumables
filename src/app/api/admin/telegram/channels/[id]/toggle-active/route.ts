import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';

import { getSessionFromRequestCookies } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getSessionFromRequestCookies();
  if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (session.user.role !== Role.ADMIN) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  return null;
}

export async function POST(_request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const item = await prisma.telegramChannel.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: 'Канал не найден' }, { status: 404 });

  const updated = await prisma.telegramChannel.update({ where: { id: params.id }, data: { isActive: !item.isActive } });
  return NextResponse.json({ item: updated });
}
