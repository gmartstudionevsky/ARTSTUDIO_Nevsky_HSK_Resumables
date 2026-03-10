import { Role } from '@prisma/client';

import { CatalogPageClient } from '@/components/catalog/CatalogPageClient';
import { requireManagerOrAdmin } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;

  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.error(`[catalog.page] ${label} failed (attempt ${i}/${attempts})`, error);
      if (i < attempts) await new Promise((resolve) => setTimeout(resolve, i * 120));
    }
  }

  throw lastError;
}

export default async function CatalogPage(): Promise<JSX.Element> {
  const user = await requireManagerOrAdmin();
  const [categories, expenseArticles, sections, units] = await withRetry('catalog dictionaries query', async () => Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.expenseArticle.findMany({ where: { isActive: true }, orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } }),
    prisma.section.findMany({ where: { isActive: true }, orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } }),
    prisma.unit.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]));

  return <CatalogPageClient categories={categories} expenseArticles={expenseArticles} sections={sections} units={units} canManage={user.role === Role.ADMIN || user.role === Role.MANAGER} />;
}
