import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getSessionFromRequestCookies } from '@/lib/auth/session';
import { sendDigest } from '@/lib/telegram/service';

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getSessionFromRequestCookies();
  if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (session.user.role !== Role.ADMIN) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  return null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const raw = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
  }

  const result = await sendDigest(parsed.data.date);
  return NextResponse.json({ ok: true, date: result.date, sent: result.sent, failed: result.failed });
}
