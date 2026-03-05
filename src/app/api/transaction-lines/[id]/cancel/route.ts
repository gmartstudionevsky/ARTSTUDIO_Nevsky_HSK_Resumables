import { RecordStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  reasonId: z.string().uuid().nullable().optional(),
  cancelNote: z.string().trim().nullable().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const { user, error } = await requireSupervisorOrAboveApi();
  if (error || !user) return error ?? NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const data = schema.parse(body);
    const line = await prisma.transactionLine.findUnique({ where: { id: params.id }, select: { id: true, status: true, transactionId: true } });
    if (!line) return NextResponse.json({ error: 'Строка не найдена' }, { status: 404 });
    if (line.status === RecordStatus.CANCELLED) return NextResponse.json({ ok: true });
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.transactionLine.update({
        where: { id: params.id },
        data: {
          status: RecordStatus.CANCELLED,
          cancelledAt: now,
          cancelledById: user.id,
          reasonId: data.reasonId ?? null,
          cancelNote: data.cancelNote ?? null,
        },
      });

      const activeCount = await tx.transactionLine.count({ where: { transactionId: line.transactionId, status: RecordStatus.ACTIVE } });
      if (activeCount === 0) {
        await tx.transaction.update({ where: { id: line.transactionId }, data: { status: RecordStatus.CANCELLED, cancelledAt: now, cancelledById: user.id } });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'CANCEL_TX_LINE',
          entity: 'TransactionLine',
          entityId: params.id,
          payload: { reasonId: data.reasonId ?? null },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка сервера' }, { status: 500 });
  }
}
