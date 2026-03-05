import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getSessionFromRequestCookies } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { sendMessage } from '@/lib/telegram/client';

const bodySchema = z.object({
  channelId: z.string().uuid(),
  text: z.string().trim().optional(),
});

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getSessionFromRequestCookies();
  if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (session.user.role !== Role.ADMIN) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  return null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const authError = await requireAdmin();
  if (authError) return authError;

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN не задан' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });

  const channel = await prisma.telegramChannel.findUnique({ where: { id: parsed.data.channelId } });
  if (!channel) return NextResponse.json({ error: 'Канал не найден' }, { status: 404 });

  await sendMessage({ chatId: channel.chatId, text: parsed.data.text || 'Тестовое сообщение из ARTSTUDIO Consumables' });
  return NextResponse.json({ ok: true });
}
