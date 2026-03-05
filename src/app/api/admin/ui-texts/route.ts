import { Role, UiTextScope } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getSessionFromRequestCookies } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

const createSchema = z.object({
  key: z.string().min(3).max(80).regex(/^[a-z0-9._-]+$/),
  ruText: z.string().min(1).max(400),
  scope: z.nativeEnum(UiTextScope),
});

const listSchema = z.object({
  q: z.string().optional(),
  scope: z.enum(['all', 'BOTH', 'WEB', 'MOBILE']).optional().default('all'),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getSessionFromRequestCookies();
  if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (session.user.role !== Role.ADMIN) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  return null;
}

export async function GET(request: Request): Promise<NextResponse> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const parsed = listSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: 'Некорректные параметры' }, { status: 400 });

  const { q, scope, limit, offset } = parsed.data;
  const where: Prisma.UiTextWhereInput = {
    ...(scope !== 'all' ? { scope } : {}),
    ...(q
      ? {
          OR: [
            { key: { contains: q, mode: 'insensitive' } },
            { ruText: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.uiText.findMany({ where, orderBy: { updatedAt: 'desc' }, take: limit, skip: offset }),
    prisma.uiText.count({ where }),
  ]);

  return NextResponse.json({ items, total });
}

export async function POST(request: Request): Promise<NextResponse> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });

  try {
    const item = await prisma.uiText.create({ data: parsed.data });
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ключ уже существует' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
