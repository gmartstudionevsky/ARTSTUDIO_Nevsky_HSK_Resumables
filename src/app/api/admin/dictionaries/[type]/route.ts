import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

import { getSessionFromRequestCookies } from '@/lib/auth/session';
import { createDictionary, listDictionary, parseDictionaryType } from '@/lib/admin/dictionaries';

const listQuerySchema = z.object({
  q: z.string().optional(),
  active: z.enum(['true', 'false', 'all']).optional().default('true'),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getSessionFromRequestCookies();
  if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (session.user.role !== Role.ADMIN) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  return null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Ошибка сервера';
}

export async function GET(request: Request, { params }: { params: { type: string } }): Promise<NextResponse> {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const type = parseDictionaryType(params.type);
    const query = listQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const response = await listDictionary(type, query);
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Некорректные параметры' }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Неизвестный тип справочника') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { type: string } }): Promise<NextResponse> {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const type = parseDictionaryType(params.type);
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
    const item = await createDictionary(type, body);
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
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
