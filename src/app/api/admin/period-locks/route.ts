import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuthenticatedApiUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({ year: z.coerce.number().int().min(2000).max(2100) });

export async function GET(request: Request): Promise<NextResponse> {
  const { user, error } = await requireAuthenticatedApiUser();
  if (error || !user) return error ?? NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (user.role !== Role.ADMIN) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });

  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const { year } = schema.parse(params);

  const locks = await prisma.periodLock.findMany({ where: { year }, include: { lockedBy: { select: { id: true, login: true } } } });
  const lockByMonth = new Map<number, (typeof locks)[number]>();
  locks.forEach((lock) => lockByMonth.set(lock.month, lock));

  return NextResponse.json({
    year,
    months: Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
      const lock = lockByMonth.get(month);
      return {
        month,
        isLocked: Boolean(lock?.isLocked),
        lockedAt: lock?.lockedAt ?? null,
        lockedBy: lock?.lockedBy ?? null,
        note: lock?.note ?? null,
      };
    }),
  });
}
