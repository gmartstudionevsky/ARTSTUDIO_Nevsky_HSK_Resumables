import { NextResponse } from 'next/server';

import { COMPAT_ROUTE_HEADERS } from '@/app/api/accounting-positions/shared';
import { safeServerErrorResponse } from '@/lib/api/errors';
import { requireManagerOrAdminApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';

function responseHeaders(request: Request): HeadersInit | undefined {
  return new URL(request.url).pathname.includes('/api/items/') ? COMPAT_ROUTE_HEADERS : undefined;
}

export async function GET(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const authError = await requireManagerOrAdminApi();
  if (authError) return authError;

  try {
    const [item, categories, expenseArticles, sections, units] = await Promise.all([
      prisma.accountingPosition.findUnique({ where: { id: params.id } }),
      prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.expenseArticle.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } }),
      prisma.section.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } }),
      prisma.unit.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    ]);

    if (!item) return NextResponse.json({ error: 'Позиция не найдена' }, { status: 404, headers: responseHeaders(request) });

    const canonicalItem = {
      ...item,
      defaultSectionId: item.defaultPurposeId,
      defaultPurposeId: item.defaultPurposeId,
    };

    return NextResponse.json(
      {
        accountingPosition: canonicalItem,
        item: canonicalItem,
        refs: { categories, expenseArticles, sections, purposes: sections, units },
      },
      { headers: responseHeaders(request) },
    );
  } catch (error) {
    return safeServerErrorResponse(error, 'Ошибка загрузки позиции');
  }
}
