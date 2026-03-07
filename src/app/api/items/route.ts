import { Prisma, RecordStatus, TxType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { requireAuthenticatedApiUser, requireManagerOrAdminApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { mapAccountingPositionDraftToItemDraft, mapItemRecordToAccountingPosition } from '@/lib/domain/accounting-position';
import { toPositionCatalogEntry } from '@/lib/domain/position-catalog';
import { generateNextItemCode } from '@/lib/items/codeGen';
import { createItemSchema, listItemsQuerySchema } from '@/lib/items/validators';

function isUniqueCodeError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}


function makeBatchId(): string {
  const date = new Date();
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `BAT-${y}${m}${d}-${rand}`;
}

function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(6));
}

export async function GET(request: Request): Promise<NextResponse> {
  const { error } = await requireAuthenticatedApiUser();
  if (error) return error;

  try {
    const query = listItemsQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const activeFilter = query.active === 'all' ? undefined : query.active === 'true';
    const q = query.q?.trim();

    const where: Prisma.ItemWhereInput = {
      ...(activeFilter === undefined ? {} : { isActive: activeFilter }),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.expenseArticleId ? { defaultExpenseArticleId: query.expenseArticleId } : {}),
      ...(query.purposeId ? { defaultPurposeId: query.purposeId } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
              { synonyms: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
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
        orderBy: [{ updatedAt: 'desc' }],
        take: query.limit,
        skip: query.offset,
      }),
      prisma.item.count({ where }),
    ]);

    const accountingPositions = items.map(mapItemRecordToAccountingPosition);
    const catalogEntries = accountingPositions.map(toPositionCatalogEntry);

    return NextResponse.json({
      items: catalogEntries,
      total,
      catalogPositions: catalogEntries,
    });
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
    const itemDraft = mapAccountingPositionDraftToItemDraft(data);

    const result = await prisma.$transaction(async (tx) => {
      const code = data.code ?? (await generateNextItemCode(tx));
      const created = await tx.item.create({
        data: {
          code,
          name: itemDraft.name,
          categoryId: itemDraft.categoryId,
          defaultExpenseArticleId: itemDraft.defaultExpenseArticleId,
          defaultPurposeId: itemDraft.defaultPurposeId,
          baseUnitId: itemDraft.baseUnitId,
          defaultInputUnitId: itemDraft.defaultInputUnitId,
          reportUnitId: itemDraft.reportUnitId,
          minQtyBase: itemDraft.minQtyBase,
          synonyms: itemDraft.synonyms,
          note: itemDraft.note,
          isActive: itemDraft.isActive,
        },
      });

      await tx.itemUnit.create({
        data: {
          itemId: created.id,
          unitId: data.baseUnitId,
          factorToBase: 1,
          isAllowed: true,
          isDefaultInput: data.defaultInputUnitId === data.baseUnitId,
          isDefaultReport: data.reportUnitId === data.baseUnitId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'CREATE_ITEM',
          entity: 'Item',
          entityId: created.id,
          payload: { code: created.code, name: created.name },
        },
      });

      let transactionId: string | undefined;
      if (data.initialStock?.enabled) {
        if (!data.initialStock.unitId || data.initialStock.qty === undefined || Number.isNaN(data.initialStock.qty) || data.initialStock.qty <= 0) {
          throw new Error('Некорректные данные первичного прихода');
        }

        const itemUnit = await tx.itemUnit.findUnique({
          where: { itemId_unitId: { itemId: created.id, unitId: data.initialStock.unitId } },
          select: { factorToBase: true, isAllowed: true },
        });
        if (!itemUnit?.isAllowed) {
          throw new Error('Единица первичного прихода не разрешена для позиции');
        }

        const occurredAt = data.initialStock.occurredAt ? new Date(data.initialStock.occurredAt) : new Date();
        if (Number.isNaN(occurredAt.getTime())) {
          throw new Error('Некорректная дата первичного прихода');
        }

        const qtyInput = toDecimal(data.initialStock.qty);
        const qtyBase = toDecimal(new Prisma.Decimal(data.initialStock.qty).mul(itemUnit.factorToBase).toNumber());

        const createdTx = await tx.transaction.create({
          data: {
            batchId: makeBatchId(),
            type: TxType.IN,
            occurredAt,
            createdById: user.id,
            note: data.initialStock.comment ?? 'Первичное поступление при создании позиции',
            status: RecordStatus.ACTIVE,
          },
        });

        await tx.transactionLine.create({
          data: {
            transactionId: createdTx.id,
            itemId: created.id,
            qtyInput,
            unitId: data.initialStock.unitId,
            qtyBase,
            expenseArticleId: created.defaultExpenseArticleId,
            purposeId: created.defaultPurposeId,
            comment: data.initialStock.comment ?? null,
            status: RecordStatus.ACTIVE,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: 'CREATE_TX',
            entity: 'Transaction',
            entityId: createdTx.id,
            payload: { type: TxType.IN, source: 'ITEM_CREATE', itemId: created.id },
          },
        });

        transactionId = createdTx.id;
      }

      return { item: created, transactionId };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? 'Некорректные данные' }, { status: 400 });
    if (isUniqueCodeError(error)) return NextResponse.json({ error: 'Позиция с таким кодом уже существует' }, { status: 409 });
    if (error instanceof Error && (error.message.includes('первичного прихода') || error.message.includes('разрешена') || error.message.includes('дата'))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка сервера' }, { status: 500 });
  }
}
