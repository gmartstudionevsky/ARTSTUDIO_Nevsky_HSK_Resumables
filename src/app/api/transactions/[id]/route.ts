import { NextResponse } from 'next/server';

import { requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { safeServerErrorResponse } from '@/lib/api/errors';
import { prisma } from '@/lib/db/prisma';

export async function GET(_request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const { error } = await requireSupervisorOrAboveApi();
  if (error) return error;

  try {
    const tx = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: {
        createdBy: { select: { id: true, login: true } },
        cancelledBy: { select: { id: true, login: true } },
        reason: { select: { id: true, code: true, name: true } },
      },
    });
    if (!tx) return NextResponse.json({ error: 'Движение не найдено' }, { status: 404 });

    const lines = await prisma.transactionLine.findMany({
      where: { transactionId: tx.id },
      include: {
        item: { select: { id: true, code: true, name: true } },
        unit: { select: { id: true, name: true } },
        expenseArticle: { select: { id: true, code: true, name: true } },
        purpose: { select: { id: true, code: true, name: true } },
        cancelledBy: { select: { id: true, login: true } },
        reason: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ status: 'asc' }, { id: 'asc' }],
    });

    const linesActive = lines.filter((line) => line.status === 'ACTIVE').length;
    const linesCancelled = lines.length - linesActive;
    const uiStatus = linesActive === 0 ? 'CANCELLED' : linesCancelled > 0 ? 'PARTIAL' : 'ACTIVE';

    return NextResponse.json({
      transaction: {
        id: tx.id,
        batchId: tx.batchId,
        type: tx.type,
        occurredAt: tx.occurredAt,
        createdAt: tx.createdAt,
        note: tx.note,
        status: tx.status,
        cancelledAt: tx.cancelledAt,
        cancelNote: tx.cancelNote,
        cancelledBy: tx.cancelledBy,
        reason: tx.reason,
        createdBy: tx.createdBy,
      },
      lines: lines.map((line) => ({
        id: line.id,
        accountingPosition: line.item,
        item: line.item,
        qtyInput: line.qtyInput.toString(),
        unit: line.unit,
        qtyBase: line.qtyBase.toString(),
        expenseArticle: line.expenseArticle,
        section: line.purpose,
        purpose: line.purpose,
        comment: line.comment,
        status: line.status,
        cancelledAt: line.cancelledAt,
        cancelNote: line.cancelNote,
        cancelledBy: line.cancelledBy,
        reason: line.reason,
        correctedFromLineId: line.correctedFromLineId,
      })),
      uiStatus,
    });
  } catch (error) {
    return safeServerErrorResponse(error);
  }
}
