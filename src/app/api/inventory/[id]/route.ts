import { NextResponse } from 'next/server';

import { requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';

export async function GET(_: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const { error } = await requireSupervisorOrAboveApi();
  if (error) return error;

  const session = await prisma.inventorySession.findUnique({
    where: { id: params.id },
    include: {
      createdBy: { select: { id: true, login: true } },
      appliedBy: { select: { id: true, login: true } },
      lines: {
        include: {
          item: { select: { id: true, code: true, name: true, reportUnit: { select: { id: true, name: true } } } },
          unit: { select: { id: true, name: true } },
        },
        orderBy: { item: { code: 'asc' } },
      },
    },
  });

  if (!session) return NextResponse.json({ error: 'Инвентаризация не найдена' }, { status: 404 });

  return NextResponse.json({
    session: {
      id: session.id,
      occurredAt: session.occurredAt,
      status: session.status,
      mode: session.mode,
      note: session.note,
      createdBy: session.createdBy,
      createdAt: session.createdAt,
      appliedBy: session.appliedBy,
      appliedAt: session.appliedAt,
    },
    lines: session.lines.map((line) => ({
      id: line.id,
      item: line.item,
      unit: line.unit,
      qtySystemBase: line.qtySystemBase.toString(),
      qtyFactInput: line.qtyFactInput?.toString() ?? null,
      qtyFactBase: line.qtyFactBase?.toString() ?? null,
      deltaBase: line.deltaBase?.toString() ?? null,
      apply: line.apply,
      comment: line.comment,
    })),
  });
}
