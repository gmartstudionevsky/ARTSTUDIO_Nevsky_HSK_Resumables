import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getSessionFromRequestCookies } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

const querySchema = z.object({
  q: z.string().optional(),
  active: z.enum(['true', 'false', 'all']).optional().default('all'),
});

const createSchema = z.object({
  name: z.string().trim().min(1),
  chatId: z.string().trim().min(1),
  isActive: z.boolean().optional().default(true),
});

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getSessionFromRequestCookies();
  if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (session.user.role !== Role.ADMIN) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  return null;
}

export async function GET(request: Request): Promise<NextResponse> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: 'Некорректные параметры запроса' }, { status: 400 });

  const { q, active } = parsed.data;

  const items = await prisma.telegramChannel.findMany({
    where: {
      ...(q
        ? {
            OR: [{ name: { contains: q, mode: 'insensitive' } }, { chatId: { contains: q, mode: 'insensitive' } }],
          }
        : {}),
      ...(active !== 'all' ? { isActive: active === 'true' } : {}),
    },
    include: { rules: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ items });
}

export async function POST(request: Request): Promise<NextResponse> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });

  try {
    const item = await prisma.telegramChannel.create({ data: parsed.data });
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof Error && error.message.includes('TelegramChannel_chatId_key')) {
      return NextResponse.json({ error: 'Канал с таким chatId уже существует' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
