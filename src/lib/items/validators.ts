import { z } from 'zod';

const optionalText = z.string().trim().optional().transform((value) => {
  if (!value) return undefined;
  return value;
});

const nullableOptionalText = z.string().trim().nullable().optional().transform((value) => {
  if (!value) return undefined;
  return value;
});

const optionalNumberInput = z.union([z.string(), z.number()]).optional().transform((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  return Number(value);
});

export const listItemsQuerySchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  expenseArticleId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  purposeId: z.string().uuid().optional(),
  active: z.enum(['true', 'false', 'all']).optional().default('true'),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const createItemSchema = z.object({
  code: z.string().trim().min(1).max(20).optional(),
  name: z.string().trim().min(2).max(150),
  categoryId: z.string().uuid(),
  defaultExpenseArticleId: z.string().uuid(),
  defaultSectionId: z.string().uuid(),
  defaultPurposeId: z.string().uuid().optional(),
  baseUnitId: z.string().uuid(),
  defaultInputUnitId: z.string().uuid(),
  reportUnitId: z.string().uuid(),
  minQtyBase: z.coerce.number().positive().optional(),
  synonyms: optionalText,
  note: optionalText,
  isActive: z.boolean().optional().default(true),
  initialStock: z.object({
    enabled: z.boolean(),
    qty: optionalNumberInput,
    unitId: z.string().uuid().optional(),
    occurredAt: nullableOptionalText,
    comment: nullableOptionalText,
    mode: z.enum(['IN', 'OPENING']).optional().default('IN'),
  }).optional(),
}).superRefine((data, ctx) => {
  if (!data.initialStock?.enabled) return;
  if (!data.initialStock.unitId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['initialStock', 'unitId'], message: 'Укажите единицу для первичного прихода' });
  }
  if (!data.initialStock.qty || Number.isNaN(data.initialStock.qty) || data.initialStock.qty <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['initialStock', 'qty'], message: 'Количество первичного прихода должно быть больше нуля' });
  }
});

export const patchItemSchema = z.object({
  code: z.string().trim().min(1).max(20).optional(),
  name: z.string().trim().min(2).max(150).optional(),
  categoryId: z.string().uuid().optional(),
  defaultExpenseArticleId: z.string().uuid().optional(),
  defaultSectionId: z.string().uuid().optional(),
  defaultPurposeId: z.string().uuid().optional(),
  baseUnitId: z.string().uuid().optional(),
  defaultInputUnitId: z.string().uuid().optional(),
  reportUnitId: z.string().uuid().optional(),
  minQtyBase: z.coerce.number().positive().nullable().optional(),
  synonyms: z.string().trim().nullable().optional(),
  note: z.string().trim().nullable().optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'Нет данных для обновления' });

export const toggleItemActiveSchema = z.object({
  isActive: z.boolean(),
});

export const itemUnitSchema = z.object({
  unitId: z.string().uuid(),
  factorToBase: z.coerce.number().positive(),
  isAllowed: z.boolean(),
  isDefaultInput: z.boolean(),
  isDefaultReport: z.boolean(),
});

export const putItemUnitsSchema = z.object({
  units: z.array(itemUnitSchema).min(1),
});
