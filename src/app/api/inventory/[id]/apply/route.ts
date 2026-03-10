import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createAccountingEventWriteService } from '@/lib/application/accounting-event';
import { requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { applyInventorySchema } from '@/lib/inventory/validators';
import { registerProjectionUpdate } from '@/lib/read-models';

const accountingEventWriteService = createAccountingEventWriteService();

export async function POST(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const { user, error } = await requireSupervisorOrAboveApi();
  if (error || !user) return error ?? NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (user.role !== Role.MANAGER && user.role !== Role.ADMIN) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });

  try {
    const body = await request.json().catch(() => null);
    const data = applyInventorySchema.parse(body ?? {});
    const result = await accountingEventWriteService.applyInventoryResult({
      sessionId: params.id,
      reasonId: data.reasonId ?? null,
      note: data.note ?? null,
      interpretationMode: 'AFFECT_ANALYTICS',
      context: {
        actorId: user.id,
        actorRole: user.role,
        entryPoint: 'api',
        correlationId: request.headers.get('x-correlation-id') ?? undefined,
      },
    });

    if (!result.ok) {
      const status = result.kind === 'not_found' ? 404 : result.kind === 'unexpected' ? 500 : result.kind === 'conflict' ? 409 : 400;
      return NextResponse.json({ error: result.message, scenario: result.scenario, details: result.details }, { status });
    }

    registerProjectionUpdate(result.data.projection);

    return NextResponse.json({
      ok: true,
      transactionId: result.data.transaction.id,
      transactionType: result.data.transaction.type,
      appliedLines: result.data.inventory?.appliedLines ?? result.data.lines.length,
      projection: result.data.projection,
      recovery: result.data.recovery,
      interpretationMode: result.data.inventory?.interpretationMode,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
