import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { createAccountingPositionWriteService } from '@/lib/application/accounting-position';
import { requireAuthenticatedApiUser, requireManagerOrAdminApi } from '@/lib/auth/guards';
import { getPositionCatalogProjection } from '@/lib/read-models';
import { createItemSchema, listItemsQuerySchema } from '@/lib/items/validators';

function isUniqueCodeError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

const accountingPositionWriteService = createAccountingPositionWriteService();

const COMPAT_HEADERS = {
  'Deprecation': 'true',
  'Sunset': 'Tue, 30 Jun 2026 00:00:00 GMT',
  'Link': '</api/accounting-positions>; rel="successor-version"',
  'X-ARTSTUDIO-Compat-Route': 'secondary-items-alias',
} as const;

function toHttpStatus(kind: 'validation' | 'invariant' | 'domain_semantic' | 'not_found' | 'conflict' | 'unexpected'): number {
  if (kind === 'validation' || kind === 'invariant' || kind === 'domain_semantic') return 400;
  if (kind === 'not_found') return 404;
  if (kind === 'conflict') return 409;
  return 500;
}

export async function GET(request: Request): Promise<NextResponse> {
  const { error } = await requireAuthenticatedApiUser();
  if (error) return error;

  try {
    const query = listItemsQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const projection = await getPositionCatalogProjection({ ...query, sectionId: query.sectionId ?? query.purposeId });

    return NextResponse.json({
      accountingPositions: projection.entries,
      total: projection.total,
      items: projection.entries,
      catalogPositions: projection.entries,
    }, { headers: COMPAT_HEADERS });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Некорректные параметры запроса' }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const authError = await requireManagerOrAdminApi();
  if (authError) return authError;
  const { user } = await requireAuthenticatedApiUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
    const data = createItemSchema.parse(body);
    const result = await accountingPositionWriteService.create({
      ...data,
      defaultPurposeId: data.defaultSectionId ?? data.defaultPurposeId,
      context: {
        actorId: user.id,
        entryPoint: 'api',
        correlationId: request.headers.get('x-correlation-id') ?? undefined,
      },
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message, scenario: result.scenario }, { status: toHttpStatus(result.kind) });
    }

    return NextResponse.json({
      item: result.data.item,
      transactionId: result.data.transactionId,
      accountingPosition: result.data.accountingPosition,
    }, { headers: COMPAT_HEADERS });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? 'Некорректные данные' }, { status: 400 });
    if (isUniqueCodeError(error)) return NextResponse.json({ error: 'Позиция с таким кодом уже существует' }, { status: 409 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка сервера' }, { status: 500 });
  }
}
