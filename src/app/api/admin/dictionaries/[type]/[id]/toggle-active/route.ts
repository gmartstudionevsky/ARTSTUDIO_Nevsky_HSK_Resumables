import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getSessionFromRequestCookies } from '@/lib/auth/session';
import { parseDictionaryType, toggleActive } from '@/lib/admin/dictionaries';

const bodySchema = z.object({ isActive: z.boolean() });

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getSessionFromRequestCookies();
  if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (session.user.role !== Role.ADMIN) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  return null;
}

export async function POST(request: Request, { params }: { params: { type: string; id: string } }): Promise<NextResponse> {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const type = parseDictionaryType(params.type);
    const body = bodySchema.parse(await request.json().catch(() => null));
    const item = await toggleActive(type, params.id, body.isActive);
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Неизвестный тип справочника') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка сервера' }, { status: 500 });
  }
}
