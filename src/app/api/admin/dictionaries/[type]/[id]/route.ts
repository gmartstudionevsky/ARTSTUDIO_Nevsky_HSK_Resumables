import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { getSessionFromRequestCookies } from '@/lib/auth/session';
import { parseDictionaryType, updateDictionary } from '@/lib/admin/dictionaries';

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getSessionFromRequestCookies();
  if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (session.user.role !== Role.ADMIN) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  return null;
}

export async function PATCH(request: Request, { params }: { params: { type: string; id: string } }): Promise<NextResponse> {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const type = parseDictionaryType(params.type);
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
    const item = await updateDictionary(type, params.id, body);
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    }
    if (error instanceof Error && error.message.startsWith('Уже существует')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof Error && error.message === 'Неизвестный тип справочника') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка сервера' }, { status: 500 });
  }
}
