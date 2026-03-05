import { NextResponse } from 'next/server';

import { requireManagerOrAdminApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';

export async function GET(_: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const authError = await requireManagerOrAdminApi();
  if (authError) return authError;

  const [item, categories, expenseArticles, purposes, units] = await Promise.all([
    prisma.item.findUnique({ where: { id: params.id } }),
    prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.expenseArticle.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } }),
    prisma.purpose.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } }),
    prisma.unit.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  if (!item) return NextResponse.json({ error: 'Позиция не найдена' }, { status: 404 });
  return NextResponse.json({ item, refs: { categories, expenseArticles, purposes, units } });
}
