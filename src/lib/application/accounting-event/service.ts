import { InventoryMode, InventoryStatus, Prisma, RecordStatus, MovementType } from '@prisma/client';

import {
  AccountingEventUseCaseResult,
  AccountingEventWriteService,
  ApplyInventoryResultCommand,
  CreateAccountingMovementCommand,
  CreateOpeningEventCommand,
  EventWriteFlowLineInput,
  InventoryApplyInterpretationMode,
} from '@/lib/application/accounting-event/contracts';
import { WriteFlowContext, WriteFlowFailureKind } from '@/lib/application/write-flow/types';
import { prisma } from '@/lib/db/prisma';
import { mapItemRecordToAccountingPositionWithValidation, validateAccountingPositionWriteDraft } from '@/lib/domain/accounting-position';
import { isDateLocked } from '@/lib/period-locks/service';
import { getSettings } from '@/lib/settings/service';
import { getCurrentQtyBaseByItemIds } from '@/lib/stock/currentQty';

const MOVEMENT_SCENARIO = 'accounting-event.create-movement';
const OPENING_SCENARIO = 'accounting-event.create-opening';
const APPLY_INVENTORY_SCENARIO = 'accounting-event.apply-inventory';

function failure(
  scenario: string,
  kind: WriteFlowFailureKind,
  message: string,
  context?: WriteFlowContext,
  details?: Record<string, unknown>,
): AccountingEventUseCaseResult {
  return { ok: false, scenario, kind, message, context, details };
}

function makeBatchId(): string {
  const date = new Date();
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `BAT-${y}${m}${d}-${rand}`;
}

function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(6));
}

function parseOccurredAt(raw?: string | null): Date | null {
  if (!raw) return new Date();
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function normalizeIntakeMode(mode: CreateAccountingMovementCommand['intakeMode']): 'SINGLE_PURPOSE' | 'DISTRIBUTE_PURPOSES' | undefined {
  if (!mode) return undefined;
  if (mode === 'SINGLE_SECTION') return 'SINGLE_PURPOSE';
  if (mode === 'DISTRIBUTE_SECTIONS') return 'DISTRIBUTE_PURPOSES';
  return mode;
}

function normalizeLine(line: EventWriteFlowLineInput): EventWriteFlowLineInput {
  const itemId = line.itemId ?? line.accountingPositionId;
  const purposeId = line.purposeId ?? line.sectionId;
  const distributions = line.distributions ?? line.sectionDistributions?.map((d) => ({ purposeId: d.sectionId, qtyInput: d.qtyInput }));
  if (!itemId) return line;
  return { ...line, itemId, purposeId, distributions };
}

function resolveInventoryEventType(mode: InventoryMode): MovementType {
  return mode === InventoryMode.OPENING ? MovementType.OPENING : MovementType.INVENTORY_APPLY;
}

type TransactionClient = Prisma.TransactionClient;

const INTERACTIVE_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 20_000,
} as const;

interface AccountingEventWriteServiceDeps {
  db: {
    $transaction<T>(fn: (tx: TransactionClient) => Promise<T>, options?: { maxWait?: number; timeout?: number }): Promise<T>;
    accountingPositionUnit: typeof prisma.accountingPositionUnit;
    inventorySession: typeof prisma.inventorySession;
  };
  getSettings: typeof getSettings;
  getCurrentQtyBaseByItemIds: typeof getCurrentQtyBaseByItemIds;
  isDateLocked: typeof isDateLocked;
}

async function loadActiveItems(
  tx: TransactionClient,
  itemIds: string[],
  availability: CreateAccountingMovementCommand['availability'],
): Promise<
  {
    itemMap: Map<string, { id: string; isActive: boolean; defaultExpenseArticleId: string; defaultPurposeId: string; name: string; code: string }>;
    unitFactorMap: Map<string, Prisma.Decimal>;
    compatibilityMap: Map<string, { expenseArticleId: string | null; purposeId: string | null }>;
  }
> {
  const unitsByItem = await tx.accountingPositionUnit.findMany({
    where: { itemId: { in: itemIds }, isAllowed: true },
    include: {
      item: {
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
      },
    },
  });

  const itemMap = new Map<string, { id: string; isActive: boolean; defaultExpenseArticleId: string; defaultPurposeId: string; name: string; code: string }>();
  const unitFactorMap = new Map<string, Prisma.Decimal>();
  const compatibilityMap = new Map<string, { expenseArticleId: string | null; purposeId: string | null }>();

  for (const row of unitsByItem) {
    const item = row.item;
    if (!itemMap.has(item.id)) {
      const writeGuard = validateAccountingPositionWriteDraft(
        {
          defaultExpenseArticleId: item.defaultExpenseArticle.id,
          defaultPurposeId: item.defaultPurpose.id,
        },
        { availability: { expenseArticle: availability?.expenseArticle, section: availability?.section } },
      );
      if (!writeGuard.valid) {
        throw new Error(`INVARIANT_POSITION_WRITE_GUARD:${item.id}:${writeGuard.errors.join(';')}`);
      }

      const { invariants, position } = mapItemRecordToAccountingPositionWithValidation(item, { strict: false, availability });
      if (!invariants.valid) {
        throw new Error(`INVARIANT_POSITION:${item.id}`);
      }

      itemMap.set(item.id, {
        id: item.id,
        isActive: item.isActive,
        defaultExpenseArticleId: item.defaultExpenseArticle.id,
        defaultPurposeId: item.defaultPurpose.id,
        name: item.name,
        code: item.code,
      });
      compatibilityMap.set(item.id, {
        expenseArticleId: position.analytics.compatibility.expenseArticleId,
        purposeId: position.analytics.compatibility.purposeId,
      });
    }

    unitFactorMap.set(`${row.itemId}:${row.unitId}`, row.factorToBase);
  }

  return { itemMap, unitFactorMap, compatibilityMap };
}

async function buildResult(
  tx: TransactionClient,
  transactionId: string,
  interpretationMode: InventoryApplyInterpretationMode = 'AFFECT_ANALYTICS',
  inventoryMeta?: { sessionId: string; mode: InventoryMode; interpretationMode: InventoryApplyInterpretationMode; appliedLines: number },
  warnings?: Array<{ code: 'NEGATIVE_STOCK'; message: string; itemId: string; itemName: string }>,
  context?: WriteFlowContext,
): Promise<AccountingEventUseCaseResult> {
  const createdTx = await tx.transaction.findUnique({ where: { id: transactionId } });
  if (!createdTx) {
    return {
      ok: false,
      scenario: inventoryMeta ? APPLY_INVENTORY_SCENARIO : MOVEMENT_SCENARIO,
      kind: 'unexpected',
      message: 'Не удалось прочитать созданное событие движения',
      context,
    };
  }

  const lines = await tx.transactionLine.findMany({ where: { transactionId }, orderBy: { id: 'asc' } });
  const itemIds = [...new Set(lines.map((line) => line.itemId))];

  return {
    ok: true,
    scenario: inventoryMeta ? APPLY_INVENTORY_SCENARIO : createdTx.type === MovementType.OPENING ? OPENING_SCENARIO : MOVEMENT_SCENARIO,
    context,
    data: {
      transaction: {
        id: createdTx.id,
        batchId: createdTx.batchId,
        type: createdTx.type,
        occurredAt: createdTx.occurredAt,
      },
      lines: lines.map((line) => ({
        id: line.id,
        itemId: line.itemId,
        accountingPositionId: line.itemId,
        qtyInput: line.qtyInput.toString(),
        qtyBase: line.qtyBase.toString(),
        unitId: line.unitId,
        expenseArticleId: line.expenseArticleId,
        purposeId: line.purposeId,
        sectionId: line.purposeId,
        compatibility: {
          expenseArticleId: line.expenseArticleId,
          purposeId: line.purposeId,
          sectionId: line.purposeId,
        },
      })),
      ...(warnings && warnings.length > 0 ? { warnings } : {}),
      projection: {
        projectionKinds: ['stock', 'history', 'reports', 'signals'],
        eventType: createdTx.type,
        analyticsImpact: interpretationMode === 'STOCK_ONLY' ? 'stock_only' : 'full',
        itemIds,
        accountingPositionIds: itemIds,
        transactionId,
      },
      recovery: {
        eventContextId: transactionId,
        causalChain: [createdTx.type, createdTx.id],
        correlationId: context?.correlationId,
      },
      ...(inventoryMeta ? { inventory: inventoryMeta } : {}),
    },
  };
}

export function createAccountingEventWriteService(
  deps: AccountingEventWriteServiceDeps = {
    db: prisma,
    getSettings,
    getCurrentQtyBaseByItemIds,
    isDateLocked,
  },
): AccountingEventWriteService {
  return {
    async createMovement(command: CreateAccountingMovementCommand): Promise<AccountingEventUseCaseResult> {
      const normalizedLines = command.lines.map(normalizeLine);
      const normalizedIntakeMode = normalizeIntakeMode(command.intakeMode);
      const normalizedHeaderPurposeId = command.headerPurposeId ?? command.headerSectionId;
      const occurredAt = parseOccurredAt(command.occurredAt);
      if (!occurredAt) return failure(MOVEMENT_SCENARIO, 'validation', 'Некорректная дата события', command.context);
      if (!command.context?.actorId) return failure(MOVEMENT_SCENARIO, 'validation', 'Для создания движения требуется actorId', command.context);
      const actorId = command.context.actorId;
      if (!['IN', 'OUT', 'ADJUST'].includes(command.movementType)) {
        return failure(MOVEMENT_SCENARIO, 'domain_semantic', 'Для обычного движения разрешены только IN / OUT / ADJUST', command.context);
      }
      if (!normalizedLines.length) return failure(MOVEMENT_SCENARIO, 'validation', 'Добавьте хотя бы одну строку', command.context);

      const locked = await deps.isDateLocked(occurredAt, deps.db as unknown as typeof prisma);
      if (locked && command.context?.actorRole !== 'ADMIN') {
        return failure(MOVEMENT_SCENARIO, 'domain_semantic', 'Период закрыт для создания движения', command.context);
      }

      try {
        const settings = await deps.getSettings(deps.db as unknown as typeof prisma);
        const result = await deps.db.$transaction(async (tx) => {
          const itemIds = [...new Set(normalizedLines.map((line) => line.itemId))];
          const { itemMap, unitFactorMap } = await loadActiveItems(tx, itemIds, command.availability);

          const payloadLines: Array<{ itemId: string; qtyInput: Prisma.Decimal; unitId: string; qtyBase: Prisma.Decimal; expenseArticleId: string; purposeId: string; comment: string | null }> = [];

          for (const line of normalizedLines) {
            if (line.qtyInput <= 0) {
              return failure(MOVEMENT_SCENARIO, 'validation', 'Количество должно быть больше нуля', command.context);
            }
            const item = itemMap.get(line.itemId);
            if (!item || !item.isActive) {
              return failure(MOVEMENT_SCENARIO, 'validation', 'Позиция не найдена или неактивна', command.context, { itemId: line.itemId });
            }

            const factor = unitFactorMap.get(`${line.itemId}:${line.unitId}`);
            if (!factor) {
              return failure(MOVEMENT_SCENARIO, 'validation', 'Единица не разрешена для позиции', command.context, { itemId: line.itemId, unitId: line.unitId });
            }

            const expenseArticleId = line.expenseArticleId ?? item.defaultExpenseArticleId;
            const basePurposeId = line.purposeId ?? (normalizedIntakeMode === 'SINGLE_PURPOSE' && normalizedHeaderPurposeId ? normalizedHeaderPurposeId : item.defaultPurposeId);

            if (command.movementType === MovementType.IN && normalizedIntakeMode === 'DISTRIBUTE_PURPOSES') {
              if (!line.distributions?.length) return failure(MOVEMENT_SCENARIO, 'validation', 'Добавьте распределение по разделам', command.context);
              const sum = line.distributions.reduce((acc, entry) => acc + entry.qtyInput, 0);
              if (Math.abs(sum - line.qtyInput) > 0.0001) return failure(MOVEMENT_SCENARIO, 'validation', 'Сумма распределений должна совпадать с количеством строки', command.context);
              for (const dist of line.distributions) {
                if (dist.qtyInput <= 0) return failure(MOVEMENT_SCENARIO, 'validation', 'Количество в распределении должно быть больше нуля', command.context);
                payloadLines.push({
                  itemId: line.itemId,
                  qtyInput: toDecimal(dist.qtyInput),
                  unitId: line.unitId,
                  qtyBase: toDecimal(new Prisma.Decimal(dist.qtyInput).mul(factor).toNumber()),
                  expenseArticleId,
                  purposeId: dist.purposeId,
                  comment: line.comment ?? null,
                });
              }
            } else {
              payloadLines.push({
                itemId: line.itemId,
                qtyInput: toDecimal(line.qtyInput),
                unitId: line.unitId,
                qtyBase: toDecimal(new Prisma.Decimal(line.qtyInput).mul(factor).toNumber()),
                expenseArticleId,
                purposeId: basePurposeId,
                comment: line.comment ?? null,
              });
            }
          }

          const warnings: Array<{ code: 'NEGATIVE_STOCK'; message: string; itemId: string; itemName: string; accountingPositionId?: string; accountingPositionName?: string }> = [];
          if (command.movementType === MovementType.OUT) {
            const currentQty = await deps.getCurrentQtyBaseByItemIds(itemIds);
            const requested = new Map<string, Prisma.Decimal>();
            for (const line of payloadLines) {
              requested.set(line.itemId, (requested.get(line.itemId) ?? new Prisma.Decimal(0)).add(line.qtyBase));
            }

            const insufficient: string[] = [];
            for (const itemId of itemIds) {
              const item = itemMap.get(itemId);
              if (!item) continue;
              const current = currentQty.get(itemId) ?? new Prisma.Decimal(0);
              const req = requested.get(itemId) ?? new Prisma.Decimal(0);
              const wouldBe = current.sub(req);
              if (wouldBe.lt(0)) {
                if (!settings.allowNegativeStock) insufficient.push(itemId);
                else warnings.push({ code: 'NEGATIVE_STOCK', message: `После списания остаток по позиции «${item.name}» станет отрицательным.`, itemId, itemName: item.name, accountingPositionId: itemId, accountingPositionName: item.name });
              }
            }
            if (insufficient.length > 0) {
              return failure(MOVEMENT_SCENARIO, 'domain_semantic', 'Недостаточно остатка для списания', command.context, { itemIds: insufficient });
            }
          }

          const createdTx = await tx.transaction.create({
            data: {
              batchId: makeBatchId(),
              type: command.movementType,
              occurredAt,
              createdById: actorId,
              note: command.note ?? null,
              reasonId: command.reasonId ?? null,
              status: RecordStatus.ACTIVE,
            },
          });

          await tx.transactionLine.createMany({ data: payloadLines.map((line) => ({ ...line, transactionId: createdTx.id, status: RecordStatus.ACTIVE })) });
          await tx.auditLog.create({
            data: {
              actorId,
              action: 'CREATE_TX',
              entity: 'Transaction',
              entityId: createdTx.id,
              payload: { scenario: MOVEMENT_SCENARIO, type: command.movementType, movementClass: 'movement', linesCount: payloadLines.length },
            },
          });

          return buildResult(tx, createdTx.id, 'AFFECT_ANALYTICS', undefined, warnings, command.context);
        }, INTERACTIVE_TRANSACTION_OPTIONS);
        return result;
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('INVARIANT_POSITION')) {
          return failure(MOVEMENT_SCENARIO, 'invariant', 'Инварианты позиции нарушены для сценария движения', command.context, { cause: error.message });
        }
        return failure(MOVEMENT_SCENARIO, 'unexpected', error instanceof Error ? error.message : 'Ошибка сервера', command.context);
      }
    },

    async createOpening(command: CreateOpeningEventCommand): Promise<AccountingEventUseCaseResult> {
      const occurredAt = parseOccurredAt(command.occurredAt);
      if (!occurredAt) return failure(OPENING_SCENARIO, 'validation', 'Некорректная дата события', command.context);
      if (!command.context?.actorId) return failure(OPENING_SCENARIO, 'validation', 'Для создания opening-события требуется actorId', command.context);
      const actorId = command.context.actorId;
      if (!command.lines.length) return failure(OPENING_SCENARIO, 'validation', 'Добавьте хотя бы одну строку', command.context);

      try {
        return await deps.db.$transaction(async (tx) => {
          const itemIds = [...new Set(command.lines.map((line) => line.itemId))];
          const { itemMap, unitFactorMap } = await loadActiveItems(tx, itemIds, command.availability);

          const payloadLines: Array<{ itemId: string; qtyInput: Prisma.Decimal; unitId: string; qtyBase: Prisma.Decimal; expenseArticleId: string; purposeId: string; comment: string | null }> = [];
          for (const line of command.lines) {
            if (line.qtyInput <= 0) return failure(OPENING_SCENARIO, 'validation', 'Для OPENING количество должно быть больше нуля', command.context);
            const item = itemMap.get(line.itemId);
            if (!item || !item.isActive) return failure(OPENING_SCENARIO, 'validation', 'Позиция не найдена или неактивна', command.context, { itemId: line.itemId });
            const factor = unitFactorMap.get(`${line.itemId}:${line.unitId}`);
            if (!factor) return failure(OPENING_SCENARIO, 'validation', 'Единица не разрешена для позиции', command.context, { itemId: line.itemId, unitId: line.unitId });
            payloadLines.push({
              itemId: line.itemId,
              qtyInput: toDecimal(line.qtyInput),
              unitId: line.unitId,
              qtyBase: toDecimal(new Prisma.Decimal(line.qtyInput).mul(factor).toNumber()),
              expenseArticleId: line.expenseArticleId ?? item.defaultExpenseArticleId,
              purposeId: line.purposeId ?? item.defaultPurposeId,
              comment: line.comment ?? null,
            });
          }

          const createdTx = await tx.transaction.create({
            data: {
              batchId: makeBatchId(),
              type: MovementType.OPENING,
              occurredAt,
              createdById: actorId,
              note: command.note ?? null,
              reasonId: command.reasonId ?? null,
              status: RecordStatus.ACTIVE,
            },
          });
          await tx.transactionLine.createMany({ data: payloadLines.map((line) => ({ ...line, transactionId: createdTx.id, status: RecordStatus.ACTIVE })) });
          await tx.auditLog.create({
            data: {
              actorId,
              action: 'CREATE_TX',
              entity: 'Transaction',
              entityId: createdTx.id,
              payload: { scenario: OPENING_SCENARIO, type: MovementType.OPENING, movementClass: 'opening', source: command.source, linesCount: payloadLines.length },
            },
          });

          return buildResult(tx, createdTx.id, 'AFFECT_ANALYTICS', undefined, undefined, command.context);
        }, INTERACTIVE_TRANSACTION_OPTIONS);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('INVARIANT_POSITION')) {
          return failure(OPENING_SCENARIO, 'invariant', 'Инварианты позиции нарушены для opening-сценария', command.context, { cause: error.message });
        }
        return failure(OPENING_SCENARIO, 'unexpected', error instanceof Error ? error.message : 'Ошибка сервера', command.context);
      }
    },

    async applyInventoryResult(command: ApplyInventoryResultCommand): Promise<AccountingEventUseCaseResult> {
      if (!command.context?.actorId) return failure(APPLY_INVENTORY_SCENARIO, 'validation', 'Для применения инвентаризации требуется actorId', command.context);
      const actorId = command.context.actorId;

      try {
        return await deps.db.$transaction(async (tx) => {
          const session = await tx.inventorySession.findUnique({
            where: { id: command.sessionId },
            include: {
              lines: {
                where: { apply: true, qtyFactBase: { not: null } },
                include: { item: { select: { id: true, isActive: true, code: true, name: true, minQtyBase: true, synonyms: true, note: true, category: { select: { id: true, name: true } }, defaultExpenseArticle: { select: { id: true, code: true, name: true } }, defaultPurpose: { select: { id: true, code: true, name: true } }, baseUnit: { select: { id: true, name: true } }, defaultInputUnit: { select: { id: true, name: true } }, reportUnit: { select: { id: true, name: true } } } } },
              },
            },
          });

          if (!session) return failure(APPLY_INVENTORY_SCENARIO, 'not_found', 'Инвентаризация не найдена', command.context);
          if (session.status !== InventoryStatus.DRAFT) return failure(APPLY_INVENTORY_SCENARIO, 'domain_semantic', 'Применение доступно только для черновика', command.context);

          const locked = await deps.isDateLocked(new Date(session.occurredAt), deps.db as unknown as typeof prisma);
          if (locked && command.context?.actorRole !== 'ADMIN') {
            return failure(APPLY_INVENTORY_SCENARIO, 'domain_semantic', 'Период закрыт. Применение инвентаризации недоступно', command.context);
          }

          const txType = resolveInventoryEventType(session.mode);
          const applyLines: Array<{ itemId: string; unitId: string; qtyInput: Prisma.Decimal; qtyBase: Prisma.Decimal; expenseArticleId: string; purposeId: string; comment: string | null }> = [];

          for (const line of session.lines) {
            const { invariants } = mapItemRecordToAccountingPositionWithValidation(line.item, { strict: false, availability: command.availability });
            if (!invariants.valid) return failure(APPLY_INVENTORY_SCENARIO, 'invariant', 'Инварианты позиции нарушены для применения инвентаризации', command.context, { itemId: line.itemId, issues: invariants.issues });

            const systemBase = session.mode === InventoryMode.OPENING ? new Prisma.Decimal(0) : line.qtySystemBase;
            const factBase = line.qtyFactBase;
            if (!factBase) continue;

            if (session.mode === InventoryMode.OPENING) {
              if (factBase.lt(0)) return failure(APPLY_INVENTORY_SCENARIO, 'domain_semantic', 'Для открытия склада факт не может быть отрицательным', command.context);
              if (factBase.eq(0)) continue;
              applyLines.push({
                itemId: line.itemId,
                unitId: line.unitId,
                qtyInput: line.qtyFactInput ?? factBase,
                qtyBase: factBase,
                expenseArticleId: line.item.defaultExpenseArticle.id,
                purposeId: line.item.defaultPurpose.id,
                comment: line.comment ?? 'Инвентаризация',
              });
              continue;
            }

            const delta = factBase.sub(systemBase);
            if (delta.eq(0)) continue;
            applyLines.push({
              itemId: line.itemId,
              unitId: line.item.baseUnit.id,
              qtyInput: delta,
              qtyBase: delta,
              expenseArticleId: line.item.defaultExpenseArticle.id,
              purposeId: line.item.defaultPurpose.id,
              comment: line.comment ?? 'Инвентаризация',
            });
          }

          if (applyLines.length === 0) return failure(APPLY_INVENTORY_SCENARIO, 'domain_semantic', 'Нет строк для применения', command.context);

          const createdTx = await tx.transaction.create({
            data: {
              batchId: makeBatchId(),
              type: txType,
              occurredAt: new Date(session.occurredAt),
              createdById: actorId,
              note: `${session.mode === InventoryMode.OPENING ? 'Открытие склада' : `Инвентаризация ${session.id}`}${command.note ? `. ${command.note}` : ''}`,
              reasonId: command.reasonId ?? null,
              status: RecordStatus.ACTIVE,
            },
          });

          await tx.transactionLine.createMany({ data: applyLines.map((line) => ({ ...line, transactionId: createdTx.id, status: RecordStatus.ACTIVE })) });
          await tx.inventorySession.update({ where: { id: session.id }, data: { status: InventoryStatus.APPLIED, appliedAt: new Date(), appliedById: actorId } });
          await tx.auditLog.create({
            data: {
              actorId,
              action: 'APPLY_INVENTORY',
              entity: 'InventorySession',
              entityId: session.id,
              payload: {
                scenario: APPLY_INVENTORY_SCENARIO,
                transactionId: createdTx.id,
                transactionType: txType,
                interpretationMode: command.interpretationMode,
                appliedLines: applyLines.length,
              },
            },
          });

          return buildResult(
            tx,
            createdTx.id,
            command.interpretationMode,
            {
              sessionId: session.id,
              mode: session.mode,
              interpretationMode: command.interpretationMode,
              appliedLines: applyLines.length,
            },
            undefined,
            command.context,
          );
        }, INTERACTIVE_TRANSACTION_OPTIONS);
      } catch (error) {
        return failure(APPLY_INVENTORY_SCENARIO, 'unexpected', error instanceof Error ? error.message : 'Ошибка сервера', command.context);
      }
    },
  };
}
