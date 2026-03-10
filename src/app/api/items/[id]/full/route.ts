import { NextResponse } from 'next/server';

import { requireManagerOrAdminApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const routeParams = await params;
  const authError = await requireManagerOrAdminApi();
  if (authError) return authError;

  const [item, categories, expenseArticles, sections, units] = await Promise.all([
    prisma.accountingPosition.findUnique({ where: { id: routeParams.id } }),
    prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.expenseArticle.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } }),
    prisma.section.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } }),
    prisma.unit.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  if (!item) return NextResponse.json({ error: 'Позиция не найдена' }, { status: 404 });
  return NextResponse.json({
    item: { ...item, defaultSectionId: item.defaultPurposeId },
    refs: { categories, expenseArticles, sections, purposes: sections, units },
  });
}
