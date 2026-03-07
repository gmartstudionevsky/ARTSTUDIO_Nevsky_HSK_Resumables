import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createImportSyncUseCase } from '@/lib/application/import';
import { getSessionFromRequestCookies } from '@/lib/auth/session';

const importSyncUseCase = createImportSyncUseCase();

const schema = z.object({
  jobId: z.string().uuid(),
});

async function requireAdmin(): Promise<{ id: string } | NextResponse> {
  const session = await getSessionFromRequestCookies();
  if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (session.user.role !== Role.ADMIN) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  return { id: session.user.id };
}

export async function POST(request: Request): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  try {
    const body = await request.json().catch(() => null);
    const data = schema.parse(body);
    const result = await importSyncUseCase.rollback({ jobId: data.jobId, userId: admin.id });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Некорректные параметры запроса' }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Ошибка отката импорта';
    const status = message.includes('не найден') || message.includes('недоступен') || message.includes('уже был') || message.includes('Нельзя откатить') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
