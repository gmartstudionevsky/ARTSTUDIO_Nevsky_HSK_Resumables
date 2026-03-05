import { Role, TelegramEventType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getSessionFromRequestCookies } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

const bodySchema = z.object({
  rules: z.array(
    z.object({
      eventType: z.nativeEnum(TelegramEventType),
      isEnabled: z.boolean(),
    }),
  ),
});

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getSessionFromRequestCookies();
  if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (session.user.role !== Role.ADMIN) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  return null;
}

export async function GET(_request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const rules = await prisma.telegramRule.findMany({ where: { channelId: params.id }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ items: rules });
}

export async function PUT(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });

  const channel = await prisma.telegramChannel.findUnique({ where: { id: params.id } });
  if (!channel) return NextResponse.json({ error: 'Канал не найден' }, { status: 404 });

  await prisma.$transaction(
    parsed.data.rules.map((rule) =>
      prisma.telegramRule.upsert({
        where: { channelId_eventType: { channelId: params.id, eventType: rule.eventType } },
        create: { channelId: params.id, eventType: rule.eventType, isEnabled: rule.isEnabled },
        update: { isEnabled: rule.isEnabled },
      }),
    ),
  );

  const rules = await prisma.telegramRule.findMany({ where: { channelId: params.id } });
  return NextResponse.json({ items: rules });
}
