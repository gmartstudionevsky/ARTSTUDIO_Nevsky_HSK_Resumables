import { RecordStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { isDateLocked } from '@/lib/period-locks/service';
import { getSettings } from '@/lib/settings/service';

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
    const settings = await getSettings(prisma);
    if (settings.requireReasonOnCancel && !data.reasonId) return NextResponse.json({ error: 'Укажите причину.' }, { status: 400 });
    const now = new Date();

    const transaction = await prisma.transaction.findUnique({ where: { id: params.id }, include: { lines: true } });
    if (!transaction) return NextResponse.json({ error: 'Операция не найдена' }, { status: 404 });
    if (transaction.status === RecordStatus.CANCELLED) return NextResponse.json({ ok: true });
    const locked = await isDateLocked(transaction.occurredAt, prisma);
    if (locked && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Период закрыт. Отмена операции недоступна, обратитесь к администратору.' }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: params.id },
        data: {
          status: RecordStatus.CANCELLED,
          cancelledAt: now,
          cancelledById: user.id,
          reasonId: data.reasonId ?? null,
          cancelNote: data.cancelNote ?? null,
        },
      });

      await tx.transactionLine.updateMany({
        where: { transactionId: params.id, status: RecordStatus.ACTIVE },
        data: {
          status: RecordStatus.CANCELLED,
          cancelledAt: now,
          cancelledById: user.id,
          reasonId: data.reasonId ?? null,
          cancelNote: data.cancelNote ?? null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'CANCEL_TX',
          entity: 'Transaction',
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
