import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { createAccountingPositionWriteService } from '@/lib/application/accounting-position';
import { requireAuthenticatedApiUser, requireManagerOrAdminApi, requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { safeServerErrorResponse } from '@/lib/api/errors';
import { prisma } from '@/lib/db/prisma';
import { mapItemRecordToAccountingPosition } from '@/lib/domain/accounting-position';
import { getPositionCatalogProjection } from '@/lib/read-models';
import { createItemSchema, listItemsQuerySchema, patchItemSchema } from '@/lib/items/validators';

const accountingPositionWriteService = createAccountingPositionWriteService();

export const COMPAT_ROUTE_HEADERS = {
  Deprecation: 'true',
  Sunset: 'Tue, 30 Jun 2026 00:00:00 GMT',
  Link: '</api/accounting-positions>; rel="successor-version"',
  'X-ARTSTUDIO-Compat-Route': 'secondary-items-alias',
} as const;

type CompatMode = { compatibilityRoute?: boolean };

function responseHeaders(mode?: CompatMode): HeadersInit | undefined {
  return mode?.compatibilityRoute ? COMPAT_ROUTE_HEADERS : undefined;
}

function withCompatPayload<T extends Record<string, unknown>>(payload: T, compatibilityRoute?: boolean): T {
  if (!compatibilityRoute) return payload;
  const accountingPositions = payload.accountingPositions;
  if (Array.isArray(accountingPositions)) {
    return {
      ...payload,
      items: accountingPositions,
      catalogPositions: accountingPositions,
    };
  }

  const accountingPosition = payload.accountingPosition;
  if (accountingPosition && typeof accountingPosition === 'object') {
    return {
      ...payload,
      item: payload.item ?? accountingPosition,
    };
  }

  return payload;
}

function isUniqueCodeError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function toHttpStatus(kind: 'validation' | 'invariant' | 'domain_semantic' | 'not_found' | 'conflict' | 'unexpected'): number {
  if (kind === 'validation' || kind === 'invariant' || kind === 'domain_semantic') return 400;
  if (kind === 'not_found') return 404;
  if (kind === 'conflict') return 409;
  return 500;
}

function canonicalizeSectionId<T extends { sectionId?: string; purposeId?: string }>(value: T): T & { sectionId?: string } {
  return { ...value, sectionId: value.sectionId ?? value.purposeId };
}

export async function listAccountingPositions(request: Request, mode?: CompatMode): Promise<NextResponse> {
  const { error } = await requireAuthenticatedApiUser();
  if (error) return error;

  try {
    const query = canonicalizeSectionId(listItemsQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries())));
    const projection = await getPositionCatalogProjection(query);

    return NextResponse.json(
      withCompatPayload(
        {
          accountingPositions: projection.entries,
          total: projection.total,
        },
        mode?.compatibilityRoute,
      ),
      { headers: responseHeaders(mode) },
    );
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Некорректные параметры запроса' }, { status: 400 });
    return safeServerErrorResponse(error);
  }
}

export async function createAccountingPosition(request: Request, mode?: CompatMode): Promise<NextResponse> {
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

    return NextResponse.json(
      withCompatPayload(
        {
          accountingPosition: result.data.accountingPosition,
          item: result.data.item,
          transactionId: result.data.transactionId,
        },
        mode?.compatibilityRoute,
      ),
      { headers: responseHeaders(mode) },
    );
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? 'Некорректные данные' }, { status: 400 });
    if (isUniqueCodeError(error)) return NextResponse.json({ error: 'Позиция с таким кодом уже существует' }, { status: 409 });
    return safeServerErrorResponse(error);
  }
}

export async function getAccountingPosition(_: Request, { params }: { params: { id: string } }, mode?: CompatMode): Promise<NextResponse> {
  const { error } = await requireSupervisorOrAboveApi();
  if (error) return error;

  const item = await prisma.accountingPosition.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
      minQtyBase: true,
      synonyms: true,
      note: true,
      category: { select: { id: true, name: true } },
      defaultExpenseArticle: { select: { id: true, code: true, name: true } },
      defaultPurpose: { select: { id: true, code: true, name: true } },
      baseUnit: { select: { id: true, name: true } },
      defaultInputUnit: { select: { id: true, name: true } },
      reportUnit: { select: { id: true, name: true } },
    },
  });

  if (!item) return NextResponse.json({ error: 'Позиция не найдена' }, { status: 404 });

  const accountingPosition = mapItemRecordToAccountingPosition(item);
  const canonicalItem = {
    ...item,
    defaultSectionId: item.defaultPurpose.id,
    defaultSection: item.defaultPurpose,
    minQtyBase: item.minQtyBase?.toString() ?? null,
  };

  return NextResponse.json(
    withCompatPayload(
      {
        accountingPosition,
        item: canonicalItem,
      },
      mode?.compatibilityRoute,
    ),
    { headers: responseHeaders(mode) },
  );
}

export async function updateAccountingPosition(request: Request, { params }: { params: { id: string } }, mode?: CompatMode): Promise<NextResponse> {
  const authError = await requireManagerOrAdminApi();
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
    const data = patchItemSchema.parse(body);

    const result = await accountingPositionWriteService.update({
      id: params.id,
      changes: data,
      context: {
        entryPoint: 'api',
        correlationId: request.headers.get('x-correlation-id') ?? undefined,
      },
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message, scenario: result.scenario }, { status: toHttpStatus(result.kind) });
    }

    return NextResponse.json(
      withCompatPayload(
        {
          accountingPosition: result.data.accountingPosition,
          item: result.data.item,
        },
        mode?.compatibilityRoute,
      ),
      { headers: responseHeaders(mode) },
    );
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    return safeServerErrorResponse(error);
  }
}
