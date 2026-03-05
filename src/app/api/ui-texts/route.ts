import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';

const querySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(500),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export async function GET(request: Request): Promise<NextResponse> {
  const { error } = await requireSupervisorOrAboveApi();
  if (error) return error;

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Некорректные параметры' }, { status: 400 });
  }

  const { q, limit, offset } = parsed.data;
  const where = q
    ? {
        OR: [
          { key: { contains: q, mode: 'insensitive' as const } },
          { ruText: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : undefined;

  const [items, total] = await Promise.all([
    prisma.uiText.findMany({ where, orderBy: { key: 'asc' }, take: limit, skip: offset }),
    prisma.uiText.count({ where }),
  ]);

  return NextResponse.json({ items, total });
}
