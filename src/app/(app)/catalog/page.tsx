import { Role } from '@prisma/client';

import { CatalogPageClient } from '@/components/catalog/CatalogPageClient';
import { requireManagerOrAdmin } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';

export default async function CatalogPage(): Promise<JSX.Element> {
  const user = await requireManagerOrAdmin();
  const [categories, expenseArticles, purposes, units] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.expenseArticle.findMany({ where: { isActive: true }, orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } }),
    prisma.purpose.findMany({ where: { isActive: true }, orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } }),
    prisma.unit.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  return <CatalogPageClient categories={categories} expenseArticles={expenseArticles} purposes={purposes} units={units} canManage={user.role === Role.ADMIN || user.role === Role.MANAGER} />;
}
