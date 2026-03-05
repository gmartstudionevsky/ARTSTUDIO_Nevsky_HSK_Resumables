import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  includeCancelled: z.enum(['true', 'false']).optional().default('true'),
});

export async function GET(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const { error } = await requireSupervisorOrAboveApi();
  if (error) return error;

  try {
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const lines = await prisma.transactionLine.findMany({
      where: {
        itemId: params.id,
        ...(query.includeCancelled === 'false' ? { status: 'ACTIVE' } : {}),
      },
      orderBy: [
        { transaction: { occurredAt: 'desc' } },
        { transaction: { createdAt: 'desc' } },
      ],
      take: query.limit,
      select: {
        id: true,
        qtyInput: true,
        qtyBase: true,
        status: true,
        transaction: { select: { id: true, batchId: true, type: true, occurredAt: true } },
        unit: { select: { id: true, name: true } },
        expenseArticle: { select: { id: true, code: true, name: true } },
        purpose: { select: { id: true, code: true, name: true } },
      },
    });

    return NextResponse.json({
      items: lines.map((line) => ({
        lineId: line.id,
        occurredAt: line.transaction.occurredAt.toISOString(),
        tx: line.transaction,
        qtyInput: line.qtyInput.toString(),
        unit: line.unit,
        qtyBase: line.qtyBase.toString(),
        expenseArticle: line.expenseArticle,
        purpose: line.purpose,
        status: line.status,
      })),
    });
  } catch {
    return NextResponse.json({ error: 'Некорректные параметры' }, { status: 400 });
  }
}
