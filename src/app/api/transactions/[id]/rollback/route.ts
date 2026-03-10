import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createRecoveryService } from '@/lib/application/recovery';
import { requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { safeServerErrorResponse } from '@/lib/api/errors';

const recoveryService = createRecoveryService();

const schema = z.object({
  reasonId: z.string().uuid().nullable().optional(),
  note: z.string().trim().nullable().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const { user, error } = await requireSupervisorOrAboveApi();
  if (error || !user) return error ?? NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const data = schema.parse(body);

    const result = await recoveryService.rollbackMovement({
      transactionId: params.id,
      reasonId: data.reasonId ?? null,
      note: data.note ?? null,
      context: { actorId: user.id, actorRole: user.role, entryPoint: 'api' },
    });

    if (!result.ok) {
      const status = result.kind === 'validation_failure' ? 400 : result.kind === 'blocked' ? 409 : result.kind === 'nothing_to_do' ? 200 : 500;
      return NextResponse.json({ ok: result.kind === 'nothing_to_do', error: result.message, scenario: result.scenario, details: result.details }, { status });
    }

    return NextResponse.json({ ok: true, message: result.message, data: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Некорректные данные rollback' }, { status: 400 });
    }

    return safeServerErrorResponse(error, 'Ошибка rollback');
  }
}
