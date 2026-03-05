import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

import { requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { getStockList } from '@/lib/stock/query';

const querySchema = z.object({
  q: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  expenseArticleId: z.string().uuid().optional(),
  purposeId: z.string().uuid().optional(),
  status: z.enum(['ok', 'belowMin', 'zero', 'all']).optional().default('all'),
  active: z.enum(['true', 'false', 'all']).optional().default('true'),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export async function GET(request: Request): Promise<NextResponse> {
  const { error } = await requireSupervisorOrAboveApi();
  if (error) return error;

  try {
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const payload = await getStockList(query);
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Некорректные параметры запроса' }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка сервера' }, { status: 500 });
  }
}
