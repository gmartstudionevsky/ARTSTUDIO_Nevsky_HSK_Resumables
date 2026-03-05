import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '@/lib/db/prisma';

const dictionaryTypeSchema = z.enum(['categories', 'units', 'expense-articles', 'purposes', 'reasons']);

export type DictionaryType = z.infer<typeof dictionaryTypeSchema>;

const categoryCreateSchema = z.object({ name: z.string().trim().min(2).max(80), sortOrder: z.number().int().optional().default(0), isActive: z.boolean().optional().default(true) });
const categoryUpdateSchema = z.object({ name: z.string().trim().min(2).max(80).optional(), sortOrder: z.number().int().optional(), isActive: z.boolean().optional() }).refine((data) => Object.keys(data).length > 0, { message: 'Нет данных для обновления' });
const unitCreateSchema = z.object({ name: z.string().trim().min(1).max(30), isActive: z.boolean().optional().default(true) });
const unitUpdateSchema = z.object({ name: z.string().trim().min(1).max(30).optional(), isActive: z.boolean().optional() }).refine((data) => Object.keys(data).length > 0, { message: 'Нет данных для обновления' });
const codedCreateSchema = z.object({ code: z.string().trim().min(1).max(30), name: z.string().trim().min(2).max(120), isActive: z.boolean().optional().default(true) });
const codedUpdateSchema = z.object({ code: z.string().trim().min(1).max(30).optional(), name: z.string().trim().min(2).max(120).optional(), isActive: z.boolean().optional() }).refine((data) => Object.keys(data).length > 0, { message: 'Нет данных для обновления' });

function isUniqueError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function buildUniqueError(type: DictionaryType): string {
  if (type === 'categories') return 'Уже существует раздел с таким названием';
  if (type === 'units') return 'Уже существует единица с таким названием';
  return 'Уже существует запись с таким кодом';
}

export function parseDictionaryType(param: string): DictionaryType {
  const parsed = dictionaryTypeSchema.safeParse(param);
  if (!parsed.success) {
    throw new Error('Неизвестный тип справочника');
  }
  return parsed.data;
}

export async function listDictionary(type: DictionaryType, params: { q?: string; active?: 'true' | 'false' | 'all'; limit: number; offset: number }) {
  const activeFilter = params.active ?? 'true';
  const isActiveFilter = activeFilter === 'all' ? undefined : activeFilter === 'true';
  const q = params.q?.trim();

  switch (type) {
    case 'categories': {
      const where: Prisma.CategoryWhereInput = { ...(isActiveFilter === undefined ? {} : { isActive: isActiveFilter }), ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}) };
      const [items, total] = await Promise.all([
        prisma.category.findMany({ where, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], take: params.limit, skip: params.offset }),
        prisma.category.count({ where }),
      ]);
      return { items, total };
    }
    case 'units': {
      const where: Prisma.UnitWhereInput = { ...(isActiveFilter === undefined ? {} : { isActive: isActiveFilter }), ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}) };
      const [items, total] = await Promise.all([
        prisma.unit.findMany({ where, orderBy: { name: 'asc' }, take: params.limit, skip: params.offset }),
        prisma.unit.count({ where }),
      ]);
      return { items, total };
    }
    default: {
      const where = {
        ...(isActiveFilter === undefined ? {} : { isActive: isActiveFilter }),
        ...(q ? { OR: [{ code: { contains: q, mode: 'insensitive' as const } }, { name: { contains: q, mode: 'insensitive' as const } }] } : {}),
      };
      if (type === 'expense-articles') {
        const [items, total] = await Promise.all([
          prisma.expenseArticle.findMany({ where, orderBy: [{ code: 'asc' }, { name: 'asc' }], take: params.limit, skip: params.offset }),
          prisma.expenseArticle.count({ where }),
        ]);
        return { items, total };
      }
      if (type === 'purposes') {
        const [items, total] = await Promise.all([
          prisma.purpose.findMany({ where, orderBy: [{ code: 'asc' }, { name: 'asc' }], take: params.limit, skip: params.offset }),
          prisma.purpose.count({ where }),
        ]);
        return { items, total };
      }
      const [items, total] = await Promise.all([
        prisma.reason.findMany({ where, orderBy: [{ code: 'asc' }, { name: 'asc' }], take: params.limit, skip: params.offset }),
        prisma.reason.count({ where }),
      ]);
      return { items, total };
    }
  }
}

export async function createDictionary(type: DictionaryType, data: unknown) {
  try {
    switch (type) {
      case 'categories': return prisma.category.create({ data: categoryCreateSchema.parse(data) });
      case 'units': return prisma.unit.create({ data: unitCreateSchema.parse(data) });
      case 'expense-articles': return prisma.expenseArticle.create({ data: codedCreateSchema.parse(data) });
      case 'purposes': return prisma.purpose.create({ data: codedCreateSchema.parse(data) });
      case 'reasons': return prisma.reason.create({ data: codedCreateSchema.parse(data) });
    }
  } catch (error) {
    if (isUniqueError(error)) throw new Error(buildUniqueError(type));
    throw error;
  }
}

export async function updateDictionary(type: DictionaryType, id: string, data: unknown) {
  try {
    switch (type) {
      case 'categories': return prisma.category.update({ where: { id }, data: categoryUpdateSchema.parse(data) });
      case 'units': return prisma.unit.update({ where: { id }, data: unitUpdateSchema.parse(data) });
      case 'expense-articles': return prisma.expenseArticle.update({ where: { id }, data: codedUpdateSchema.parse(data) });
      case 'purposes': return prisma.purpose.update({ where: { id }, data: codedUpdateSchema.parse(data) });
      case 'reasons': return prisma.reason.update({ where: { id }, data: codedUpdateSchema.parse(data) });
    }
  } catch (error) {
    if (isUniqueError(error)) throw new Error(buildUniqueError(type));
    throw error;
  }
}

export async function toggleActive(type: DictionaryType, id: string, isActive: boolean) {
  switch (type) {
    case 'categories': return prisma.category.update({ where: { id }, data: { isActive } });
    case 'units': return prisma.unit.update({ where: { id }, data: { isActive } });
    case 'expense-articles': return prisma.expenseArticle.update({ where: { id }, data: { isActive } });
    case 'purposes': return prisma.purpose.update({ where: { id }, data: { isActive } });
    case 'reasons': return prisma.reason.update({ where: { id }, data: { isActive } });
  }
}
