import { Prisma, RecordStatus, TxType } from '@prisma/client';

import {
  AccountingPositionUseCaseResult,
  AccountingPositionWriteService,
  CreateAccountingPositionCommand,
  SetAccountingPositionActiveStateCommand,
  UpdateAccountingPositionCommand,
} from '@/lib/application/accounting-position/contracts';
import { accountingPositionRecordSelect } from '@/lib/application/accounting-position/item-shape';
import { WriteFlowContext, WriteFlowFailureKind } from '@/lib/application/write-flow/types';
import { prisma } from '@/lib/db/prisma';
import {
  mapAccountingPositionDraftToItemDraft,
  mapItemRecordToAccountingPosition,
  validateAccountingPositionWriteDraft,
} from '@/lib/domain/accounting-position';
import { generateNextItemCode } from '@/lib/items/codeGen';

const CREATE_SCENARIO = 'accounting-position.create';
const UPDATE_SCENARIO = 'accounting-position.update';
const SET_ACTIVE_SCENARIO = 'accounting-position.set-active-state';

interface WriteTx {
  item: {
    create: typeof prisma.item.create;
    update: typeof prisma.item.update;
    findUnique: typeof prisma.item.findUnique;
  };
  itemUnit: {
    create: typeof prisma.itemUnit.create;
    findMany: typeof prisma.itemUnit.findMany;
    findUnique: typeof prisma.itemUnit.findUnique;
  };
  transaction: { create: typeof prisma.transaction.create };
  transactionLine: { create: typeof prisma.transactionLine.create };
  auditLog: { create: typeof prisma.auditLog.create };
}

interface AccountingPositionWriteServiceDeps {
  db: {
    $transaction<T>(fn: (tx: WriteTx) => Promise<T>): Promise<T>;
    item: WriteTx['item'];
    itemUnit: WriteTx['itemUnit'];
  };
  generateCode(tx: WriteTx): Promise<string>;
}

function failure(
  scenario: string,
  kind: WriteFlowFailureKind,
  message: string,
  context?: WriteFlowContext,
  details?: Record<string, unknown>,
): AccountingPositionUseCaseResult {
  return { ok: false, scenario, kind, message, context, details };
}

function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(6));
}

function makeBatchId(): string {
  const date = new Date();
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `BAT-${y}${m}${d}-${rand}`;
}

function parseOccurredAt(raw?: string | null): Date | null {
  if (!raw) return new Date();
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function createAccountingPositionWriteService(
  deps: AccountingPositionWriteServiceDeps = {
    db: prisma,
    generateCode: (tx) => generateNextItemCode(tx as unknown as Parameters<typeof generateNextItemCode>[0]),
  },
): AccountingPositionWriteService {
  return {
    async create(command: CreateAccountingPositionCommand): Promise<AccountingPositionUseCaseResult> {
      const writeGuard = validateAccountingPositionWriteDraft(command);
      if (!writeGuard.valid) {
        return failure(CREATE_SCENARIO, 'invariant', writeGuard.errors[0] ?? 'Недопустимое состояние позиции.', command.context, {
          errors: writeGuard.errors,
        });
      }

      const canonicalIntent = mapAccountingPositionDraftToItemDraft(command);

      try {
        const txResult = await deps.db.$transaction(async (tx) => {
          const code = canonicalIntent.code ?? (await deps.generateCode(tx));
          const created = await tx.item.create({
            data: {
              code,
              name: canonicalIntent.name,
              categoryId: canonicalIntent.categoryId,
              defaultExpenseArticleId: canonicalIntent.defaultExpenseArticleId,
              defaultPurposeId: canonicalIntent.defaultPurposeId,
              baseUnitId: canonicalIntent.baseUnitId,
              defaultInputUnitId: canonicalIntent.defaultInputUnitId,
              reportUnitId: canonicalIntent.reportUnitId,
              minQtyBase: canonicalIntent.minQtyBase,
              synonyms: canonicalIntent.synonyms,
              note: canonicalIntent.note,
              isActive: canonicalIntent.isActive,
            },
            select: { id: true, code: true, name: true, isActive: true, defaultExpenseArticleId: true, defaultPurposeId: true },
          });

          await tx.itemUnit.create({
            data: {
              itemId: created.id,
              unitId: canonicalIntent.baseUnitId,
              factorToBase: 1,
              isAllowed: true,
              isDefaultInput: canonicalIntent.defaultInputUnitId === canonicalIntent.baseUnitId,
              isDefaultReport: canonicalIntent.reportUnitId === canonicalIntent.baseUnitId,
            },
          });

          if (command.context?.actorId) {
            await tx.auditLog.create({
              data: {
                actorId: command.context.actorId,
                action: 'CREATE_ITEM',
                entity: 'Item',
                entityId: created.id,
                payload: { code: created.code, name: created.name, scenario: CREATE_SCENARIO, correlationId: command.context.correlationId ?? null },
              },
            });
          }

          let transactionId: string | undefined;
          if (command.initialStock?.enabled) {
            if (!command.context?.actorId) {
              return { error: failure(CREATE_SCENARIO, 'validation', 'Для первичного прихода требуется actorId в контексте write-flow', command.context) };
            }
            if (!command.initialStock.unitId || command.initialStock.qty === undefined || Number.isNaN(command.initialStock.qty) || command.initialStock.qty <= 0) {
              return { error: failure(CREATE_SCENARIO, 'validation', 'Некорректные данные первичного прихода', command.context) };
            }

            const itemUnit = await tx.itemUnit.findUnique({
              where: { itemId_unitId: { itemId: created.id, unitId: command.initialStock.unitId } },
              select: { factorToBase: true, isAllowed: true },
            });
            if (!itemUnit?.isAllowed) {
              return { error: failure(CREATE_SCENARIO, 'validation', 'Единица первичного прихода не разрешена для позиции', command.context) };
            }

            const occurredAt = parseOccurredAt(command.initialStock.occurredAt);
            if (!occurredAt) {
              return { error: failure(CREATE_SCENARIO, 'validation', 'Некорректная дата первичного прихода', command.context) };
            }

            const qtyInput = toDecimal(command.initialStock.qty);
            const qtyBase = toDecimal(new Prisma.Decimal(command.initialStock.qty).mul(itemUnit.factorToBase).toNumber());

            const txData: Prisma.TransactionCreateInput = {
              batchId: makeBatchId(),
              type: TxType.IN,
              occurredAt,
              note: command.initialStock.comment ?? 'Первичное поступление при создании позиции',
              status: RecordStatus.ACTIVE,
              createdBy: { connect: { id: command.context.actorId } },
            };

            const createdTx = await tx.transaction.create({ data: txData });

            await tx.transactionLine.create({
              data: {
                transactionId: createdTx.id,
                itemId: created.id,
                qtyInput,
                unitId: command.initialStock.unitId,
                qtyBase,
                expenseArticleId: created.defaultExpenseArticleId,
                purposeId: created.defaultPurposeId,
                comment: command.initialStock.comment ?? null,
                status: RecordStatus.ACTIVE,
              },
            });

            if (command.context?.actorId) {
              await tx.auditLog.create({
                data: {
                  actorId: command.context.actorId,
                  action: 'CREATE_TX',
                  entity: 'Transaction',
                  entityId: createdTx.id,
                  payload: { type: TxType.IN, source: 'ITEM_CREATE', itemId: created.id, scenario: CREATE_SCENARIO },
                },
              });
            }
            transactionId = createdTx.id;
          }

          const createdRecord = await tx.item.findUnique({ where: { id: created.id }, select: accountingPositionRecordSelect });
          if (!createdRecord) {
            return { error: failure(CREATE_SCENARIO, 'unexpected', 'Не удалось прочитать созданную позицию', command.context) };
          }

          const accountingPosition = mapItemRecordToAccountingPosition(createdRecord);
          return {
            data: {
              item: { id: createdRecord.id, code: createdRecord.code, name: createdRecord.name, isActive: createdRecord.isActive },
              accountingPosition,
              transactionId,
            },
          };
        });

        if ('error' in txResult && txResult.error) return txResult.error;
        return { ok: true, scenario: CREATE_SCENARIO, context: command.context, data: txResult.data };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          return failure(CREATE_SCENARIO, 'conflict', 'Позиция с таким кодом уже существует', command.context);
        }
        return failure(CREATE_SCENARIO, 'unexpected', error instanceof Error ? error.message : 'Ошибка сервера', command.context);
      }
    },

    async update(command: UpdateAccountingPositionCommand): Promise<AccountingPositionUseCaseResult> {
      const existing = await deps.db.item.findUnique({
        where: { id: command.id },
        select: { id: true, defaultExpenseArticleId: true, defaultPurposeId: true },
      });
      if (!existing) return failure(UPDATE_SCENARIO, 'not_found', 'Позиция не найдена', command.context);

      const writeGuard = validateAccountingPositionWriteDraft({
        defaultExpenseArticleId: command.changes.defaultExpenseArticleId ?? existing.defaultExpenseArticleId,
        defaultPurposeId: command.changes.defaultPurposeId ?? existing.defaultPurposeId,
      });
      if (!writeGuard.valid) {
        return failure(UPDATE_SCENARIO, 'invariant', writeGuard.errors[0] ?? 'Недопустимое состояние позиции.', command.context, {
          errors: writeGuard.errors,
        });
      }

      if (command.changes.baseUnitId) {
        const existingUnits = await deps.db.itemUnit.findMany({ where: { itemId: command.id }, select: { unitId: true } });
        if (!existingUnits.some((unit) => unit.unitId === command.changes.baseUnitId)) {
          return failure(UPDATE_SCENARIO, 'validation', 'Базовая единица должна присутствовать в списке единиц позиции', command.context);
        }
      }

      try {
        await deps.db.item.update({ where: { id: command.id }, data: command.changes });
        const updatedRecord = await deps.db.item.findUnique({ where: { id: command.id }, select: accountingPositionRecordSelect });
        if (!updatedRecord) return failure(UPDATE_SCENARIO, 'unexpected', 'Не удалось прочитать обновлённую позицию', command.context);

        const accountingPosition = mapItemRecordToAccountingPosition(updatedRecord);
        return {
          ok: true,
          scenario: UPDATE_SCENARIO,
          context: command.context,
          data: {
            item: { id: updatedRecord.id, code: updatedRecord.code, name: updatedRecord.name, isActive: updatedRecord.isActive },
            accountingPosition,
          },
        };
      } catch (error) {
        return failure(UPDATE_SCENARIO, 'unexpected', error instanceof Error ? error.message : 'Ошибка сервера', command.context);
      }
    },

    async setActiveState(command: SetAccountingPositionActiveStateCommand): Promise<AccountingPositionUseCaseResult> {
      try {
        const item = await deps.db.item.update({
          where: { id: command.id },
          data: { isActive: command.isActive },
          select: accountingPositionRecordSelect,
        });
        const accountingPosition = mapItemRecordToAccountingPosition(item);
        return {
          ok: true,
          scenario: SET_ACTIVE_SCENARIO,
          context: command.context,
          data: {
            item: { id: item.id, code: item.code, name: item.name, isActive: item.isActive },
            accountingPosition,
          },
        };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
          return failure(SET_ACTIVE_SCENARIO, 'not_found', 'Позиция не найдена', command.context);
        }
        return failure(SET_ACTIVE_SCENARIO, 'unexpected', error instanceof Error ? error.message : 'Ошибка сервера', command.context);
      }
    },
  };
}
