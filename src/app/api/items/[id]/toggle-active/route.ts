import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { requireManagerOrAdminApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { toggleItemActiveSchema } from '@/lib/items/validators';

export async function POST(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const authError = await requireManagerOrAdminApi();
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
    const data = toggleItemActiveSchema.parse(body);
    const item = await prisma.item.update({ where: { id: params.id }, data: { isActive: data.isActive } });
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка сервера' }, { status: 500 });
  }
}
