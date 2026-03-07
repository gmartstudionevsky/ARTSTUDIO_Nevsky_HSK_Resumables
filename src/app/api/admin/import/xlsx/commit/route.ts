import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createImportSyncUseCase } from '@/lib/application/import';
import { getSessionFromRequestCookies } from '@/lib/auth/session';

const importSyncUseCase = createImportSyncUseCase();

const schema = z.object({
  jobId: z.string().uuid(),
  options: z.object({
    createOpening: z.boolean().optional(),
    openingEventMode: z.enum(['OPENING', 'IN']).optional(),
    syncMode: z.enum(['AUTO', 'MANUAL']).optional(),
    unresolvedBehavior: z.enum(['CREATE', 'SKIP']).optional(),
    decisions: z.array(z.object({ rowNumber: z.number().int(), action: z.enum(['AUTO', 'CREATE', 'SKIP']), itemId: z.string().uuid().optional() })).optional(),
  }).optional(),
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
    const result = await importSyncUseCase.apply({ jobId: data.jobId, userId: admin.id, options: data.options });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Некорректные параметры запроса' }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Ошибка импорта';
    const status = message.includes('не найден') || message.includes('содержит ошибки') || message.includes('уже импортировано') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
