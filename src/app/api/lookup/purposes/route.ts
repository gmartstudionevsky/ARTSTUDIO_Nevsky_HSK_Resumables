import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuthenticatedApiUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';

const querySchema = z.object({
  active: z.enum(['true', 'false', 'all']).optional().default('true'),
});

export async function GET(request: Request): Promise<NextResponse> {
  const { error } = await requireAuthenticatedApiUser();
  if (error) return error;

  try {
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const activeFilter = query.active === 'all' ? undefined : query.active === 'true';
    const where = activeFilter === undefined ? {} : { isActive: activeFilter };
    const [items, total] = await Promise.all([
      prisma.purpose.findMany({ where, orderBy: { code: 'asc' }, select: { id: true, code: true, name: true, isActive: true } }),
      prisma.purpose.count({ where }),
    ]);
    return NextResponse.json({ items, total });
  } catch {
    return NextResponse.json({ error: 'Некорректные параметры' }, { status: 400 });
  }
}
