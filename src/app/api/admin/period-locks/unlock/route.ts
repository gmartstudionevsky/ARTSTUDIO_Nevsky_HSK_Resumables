import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuthenticatedApiUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

export async function POST(request: Request): Promise<NextResponse> {
  const { user, error } = await requireAuthenticatedApiUser();
  if (error || !user) return error ?? NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (user.role !== Role.ADMIN) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const data = schema.parse(body);

  const lock = await prisma.periodLock.upsert({
    where: { year_month: { year: data.year, month: data.month } },
    create: { year: data.year, month: data.month, isLocked: false, lockedById: user.id, note: null },
    update: { isLocked: false, lockedById: user.id, lockedAt: new Date() },
    include: { lockedBy: { select: { id: true, login: true } } },
  });

  return NextResponse.json({ lock });
}
