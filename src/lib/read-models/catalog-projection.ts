import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { evaluateAccountingPositionInvariants, mapItemRecordToAccountingPosition } from '@/lib/domain/accounting-position';

export type CatalogAvailabilityMode = 'required' | 'optional' | 'disabled';

export interface PositionCatalogProjectionQuery {
  q?: string;
  categoryId?: string;
  expenseArticleId?: string;
  purposeId?: string;
  active?: 'true' | 'false' | 'all';
  limit?: number;
  offset?: number;
  availability?: {
    expenseArticle?: CatalogAvailabilityMode;
    section?: CatalogAvailabilityMode;
    controlledParameters?: CatalogAvailabilityMode;
  };
}

export interface PositionCatalogProjectionEntry {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  category: { id: string; name: string };
  defaultExpenseArticle: { id: string; code: string; name: string };
  defaultPurpose: { id: string; code: string; name: string };
  analytics: {
    expenseArticle: { id: string; code?: string; name: string } | null;
    section: { id: string; code?: string; name: string } | null;
    controlledParameters: { mode: CatalogAvailabilityMode; valuesCount: number };
    availability: {
      expenseArticle: CatalogAvailabilityMode;
      section: CatalogAvailabilityMode;
      controlledParameters: CatalogAvailabilityMode;
    };
    compatibility: { expenseArticleId: string | null; purposeId: string | null };
    projectionEligibility: {
      expandedMetrics: boolean;
      reasons: string[];
    };
  };
}

export interface PositionCatalogProjection {
  entries: PositionCatalogProjectionEntry[];
  total: number;
}

interface ItemReader {
  findMany: typeof prisma.item.findMany;
  count: typeof prisma.item.count;
}

function toWhere(query: PositionCatalogProjectionQuery): Prisma.ItemWhereInput {
  const activeFilter = query.active === 'all' ? undefined : query.active === 'true';
  const q = query.q?.trim();

  return {
    ...(activeFilter === undefined ? {} : { isActive: activeFilter }),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.expenseArticleId ? { defaultExpenseArticleId: query.expenseArticleId } : {}),
    ...(query.purposeId ? { defaultPurposeId: query.purposeId } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
            { synonyms: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}

export async function getPositionCatalogProjection(
  query: PositionCatalogProjectionQuery,
  deps: { itemReader: ItemReader } = { itemReader: prisma.item },
): Promise<PositionCatalogProjection> {
  const where = toWhere(query);
  const limit = query.limit ?? 100;
  const offset = query.offset ?? 0;

  const [items, total] = await Promise.all([
    deps.itemReader.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
        minQtyBase: true,
        synonyms: true,
        note: true,
        category: { select: { id: true, name: true } },
        defaultExpenseArticle: { select: { id: true, code: true, name: true } },
        defaultPurpose: { select: { id: true, code: true, name: true } },
        baseUnit: { select: { id: true, name: true } },
        defaultInputUnit: { select: { id: true, name: true } },
        reportUnit: { select: { id: true, name: true } },
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: limit,
      skip: offset,
    }),
    deps.itemReader.count({ where }),
  ]);

  return {
    entries: items.map((item) => {
      const position = mapItemRecordToAccountingPosition(item, {
        availability: query.availability,
      });
      const invariants = evaluateAccountingPositionInvariants(position);

      return {
        id: position.id,
        code: position.code,
        name: position.name,
        isActive: position.isActive,
        category: position.category,
        defaultExpenseArticle: {
          id: position.defaultExpenseArticle.id,
          code: position.defaultExpenseArticle.code ?? '',
          name: position.defaultExpenseArticle.name,
        },
        defaultPurpose: {
          id: position.defaultPurpose.id,
          code: position.defaultPurpose.code ?? '',
          name: position.defaultPurpose.name,
        },
        analytics: {
          expenseArticle: position.analytics.expenseArticle,
          section: position.analytics.section,
          controlledParameters: {
            mode: position.analytics.controlledParameters.mode,
            valuesCount: position.analytics.controlledParameters.values.length,
          },
          availability: position.analytics.availability,
          compatibility: position.analytics.compatibility,
          projectionEligibility: invariants.projectionEligibility,
        },
      };
    }),
    total,
  };
}
