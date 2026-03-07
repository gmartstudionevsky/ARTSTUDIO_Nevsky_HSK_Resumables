import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { createAccountingPositionWriteService } from '@/lib/application/accounting-position';
import { requireManagerOrAdminApi } from '@/lib/auth/guards';
import { toggleItemActiveSchema } from '@/lib/items/validators';

const accountingPositionWriteService = createAccountingPositionWriteService();

function toHttpStatus(kind: 'validation' | 'invariant' | 'not_found' | 'conflict' | 'unexpected'): number {
  if (kind === 'validation' || kind === 'invariant') return 400;
  if (kind === 'not_found') return 404;
  if (kind === 'conflict') return 409;
  return 500;
}

export async function POST(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const authError = await requireManagerOrAdminApi();
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
    const data = toggleItemActiveSchema.parse(body);

    const result = await accountingPositionWriteService.setActiveState({
      id: params.id,
      isActive: data.isActive,
      context: {
        entryPoint: 'api',
        correlationId: request.headers.get('x-correlation-id') ?? undefined,
      },
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message, scenario: result.scenario }, { status: toHttpStatus(result.kind) });
    }

    return NextResponse.json({ item: result.data.item, accountingPosition: result.data.accountingPosition });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка сервера' }, { status: 500 });
  }
}
