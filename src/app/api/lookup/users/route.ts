import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuthenticatedApiUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';

const querySchema = z.object({
  active: z.enum(['true', 'false', 'all']).optional().default('true'),
  q: z.string().trim().optional().default(''),
});

export async function GET(request: Request): Promise<NextResponse> {
  const { error } = await requireAuthenticatedApiUser();
  if (error) return error;

  try {
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const activeFilter = query.active === 'all' ? undefined : query.active === 'true';

    const where = {
      ...(activeFilter === undefined ? {} : { isActive: activeFilter }),
      ...(query.q ? { login: { contains: query.q, mode: 'insensitive' as const } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { login: 'asc' },
        select: { id: true, login: true, role: true, isActive: true },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ items, total });
  } catch {
    return NextResponse.json({ error: 'Некорректные параметры' }, { status: 400 });
  }
}
