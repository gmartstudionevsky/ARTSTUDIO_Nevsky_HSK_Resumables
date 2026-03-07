import { Prisma, RecordStatus, TxType } from '@prisma/client';

import {
  CheckReadModelConsistencyCommand,
  ConsistencyIssue,
  RecoveryResult,
  RecoveryService,
  ResetReadModelStateCommand,
  ResyncReadModelCommand,
  RollbackMovementCommand,
} from '@/lib/application/recovery/contracts';
import { prisma } from '@/lib/db/prisma';
import {
  ReadProjectionKind,
  clearProjectionReceipts,
  getProjectionReceiptByKind,
  getProjectionReceipts,
  getReadModelRecoveryContract,
  setProjectionReceipt,
} from '@/lib/read-models';

const SCENARIO_ROLLBACK_MOVEMENT = 'recovery.rollback-movement';
const SCENARIO_RESET_READ_MODELS = 'recovery.reset-read-models';
const SCENARIO_RESYNC_READ_MODELS = 'recovery.resync-read-models';
const SCENARIO_CHECK_CONSISTENCY = 'recovery.check-consistency';

function makeTrace(context?: { actorId?: string; actorRole?: string; correlationId?: string; entryPoint?: 'api' | 'admin' | 'system' | 'test' }) {
  return {
    actionId: crypto.randomUUID(),
    requestedAt: new Date().toISOString(),
    ...(context ? { context } : {}),
  };
}

function ok<TData>(scenario: string, message: string, data: TData, context?: RollbackMovementCommand['context']): RecoveryResult<TData> {
  return { ok: true, kind: 'success', scenario, message, trace: makeTrace(context), data };
}

function fail<TData>(
  scenario: string,
  kind: RecoveryResult<TData>['kind'],
  message: string,
  context?: RollbackMovementCommand['context'],
  details?: Record<string, unknown>,
): RecoveryResult<TData> {
  return { ok: false, kind, scenario, message, trace: makeTrace(context), details };
}

type TxClient = Prisma.TransactionClient;

interface RecoveryDeps {
  db: {
    $transaction<T>(fn: (tx: TxClient) => Promise<T>): Promise<T>;
    transaction: typeof prisma.transaction;
    transactionLine: typeof prisma.transactionLine;
    item: typeof prisma.item;
    $queryRaw<T = unknown>(query: Prisma.Sql): Promise<T>;
  };
}

function resolveKinds(kinds: ReadProjectionKind[] | undefined, mode: 'rebuildable' | 'validateable'): ReadProjectionKind[] {
  const contract = getReadModelRecoveryContract();
  const allowed = mode === 'rebuildable' ? contract.rebuildableKinds : contract.validateableKinds;
  if (!kinds?.length) return allowed;
  return kinds.filter((kind) => allowed.includes(kind));
}

function isMovementType(type: TxType): boolean {
  return type === TxType.IN || type === TxType.OUT || type === TxType.ADJUST;
}

async function computeLatestCanonicalEventByKind(db: RecoveryDeps['db'], kind: ReadProjectionKind): Promise<{ id: string; type: TxType } | null> {
  if (kind === 'catalog' || kind === 'admin') {
    const latestItem = await db.item.findFirst({ where: {}, select: { id: true }, orderBy: { updatedAt: 'desc' } });
    return latestItem ? { id: latestItem.id, type: TxType.ADJUST } : null;
  }

  if (kind === 'stock' || kind === 'history' || kind === 'reports' || kind === 'signals') {
    const latestTx = await db.transaction.findFirst({
      where: {},
      select: { id: true, type: true },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    });
    return latestTx ? { id: latestTx.id, type: latestTx.type } : null;
  }

  return null;
}

async function computeReducedEligibilityIssues(db: RecoveryDeps['db']): Promise<ConsistencyIssue[]> {
  const rows = await db.$queryRaw<Array<{ itemId: string; itemCode: string; itemName: string; reportUnitAllowed: boolean }>>(Prisma.sql`
    SELECT i.id AS "itemId", i.code AS "itemCode", i.name AS "itemName",
      EXISTS (
        SELECT 1 FROM "ItemUnit" iu
        WHERE iu."itemId" = i.id
          AND iu."unitId" = i."reportUnitId"
          AND iu."isAllowed" = true
      ) AS "reportUnitAllowed"
    FROM "Item" i
    WHERE i."isActive" = true
  `);

  return rows
    .filter((row) => !row.reportUnitAllowed)
    .map((row) => ({
      kind: 'reports',
      severity: 'reduced_eligibility',
      code: 'REDUCED_ELIGIBILITY' as const,
      message: `Позиция ${row.itemCode} (${row.itemName}) работает в reduced eligibility: report-factor fallback допустим.`,
      details: { itemId: row.itemId, itemCode: row.itemCode },
    }));
}

export function createRecoveryService(deps: RecoveryDeps = { db: prisma }): RecoveryService {
  return {
    async rollbackMovement(command: RollbackMovementCommand) {
      if (!command.transactionId) {
        return fail(SCENARIO_ROLLBACK_MOVEMENT, 'validation_failure', 'transactionId обязателен.', command.context);
      }
      if (!command.context?.actorId) {
        return fail(SCENARIO_ROLLBACK_MOVEMENT, 'validation_failure', 'Для rollback требуется actorId.', command.context);
      }

      try {
        const txData = await deps.db.transaction.findUnique({
          where: { id: command.transactionId },
          select: { id: true, type: true, status: true },
        });

        if (!txData) {
          return fail(SCENARIO_ROLLBACK_MOVEMENT, 'validation_failure', 'Транзакция не найдена.', command.context, {
            transactionId: command.transactionId,
          });
        }

        if (!isMovementType(txData.type)) {
          return fail(
            SCENARIO_ROLLBACK_MOVEMENT,
            'blocked',
            'Rollback на текущем шаге поддержан только для movement (IN/OUT/ADJUST).',
            command.context,
            { transactionType: txData.type },
          );
        }

        if (txData.status === RecordStatus.CANCELLED) {
          return {
            ok: true,
            kind: 'nothing_to_do',
            scenario: SCENARIO_ROLLBACK_MOVEMENT,
            message: 'Транзакция уже отменена, дополнительных действий не требуется.',
            trace: makeTrace(command.context),
            data: {
              transactionId: txData.id,
              rolledBackAt: new Date().toISOString(),
              rolledBackById: command.context.actorId,
              eventType: txData.type,
              affectedLines: 0,
              historyPreserved: true as const,
            },
          };
        }

        const now = new Date();
        const result = await deps.db.$transaction(async (tx) => {
          const linesUpdate = await tx.transactionLine.updateMany({
            where: { transactionId: command.transactionId, status: RecordStatus.ACTIVE },
            data: {
              status: RecordStatus.CANCELLED,
              cancelledAt: now,
              cancelledById: command.context?.actorId,
              reasonId: command.reasonId ?? null,
              cancelNote: command.note ?? 'Rollback movement via recovery use-case',
            },
          });

          await tx.transaction.update({
            where: { id: command.transactionId },
            data: {
              status: RecordStatus.CANCELLED,
              cancelledAt: now,
              cancelledById: command.context?.actorId,
              reasonId: command.reasonId ?? null,
              cancelNote: command.note ?? 'Rollback movement via recovery use-case',
            },
          });

          await tx.auditLog.create({
            data: {
              actorId: command.context?.actorId as string,
              action: 'ROLLBACK_MOVEMENT',
              entity: 'Transaction',
              entityId: command.transactionId,
              payload: {
                reasonId: command.reasonId ?? null,
                note: command.note ?? null,
                recoveryScenario: SCENARIO_ROLLBACK_MOVEMENT,
              },
            },
          });

          return { affectedLines: linesUpdate.count };
        });

        return ok(
          SCENARIO_ROLLBACK_MOVEMENT,
          'Rollback выполнен как каноническая отмена без удаления истории.',
          {
            transactionId: command.transactionId,
            rolledBackAt: now.toISOString(),
            rolledBackById: command.context.actorId,
            eventType: txData.type,
            affectedLines: result.affectedLines,
            historyPreserved: true as const,
          },
          command.context,
        );
      } catch (error) {
        return fail(
          SCENARIO_ROLLBACK_MOVEMENT,
          'unexpected_error',
          error instanceof Error ? error.message : 'Unexpected rollback failure',
          command.context,
        );
      }
    },

    async resetReadModelState(command: ResetReadModelStateCommand) {
      const kinds = resolveKinds(command.kinds, 'rebuildable');
      if (!kinds.length) {
        return fail(SCENARIO_RESET_READ_MODELS, 'validation_failure', 'Нет допустимых projection kinds для reset.', command.context);
      }

      const cleared = clearProjectionReceipts(kinds);
      return {
        ok: true,
        kind: cleared === 0 ? 'nothing_to_do' : 'success',
        scenario: SCENARIO_RESET_READ_MODELS,
        message: cleared === 0 ? 'Projection receipts уже пусты для выбранных проекций.' : 'Projection receipts сброшены перед re-sync.',
        trace: makeTrace(command.context),
        data: { resetKinds: kinds, receiptsCleared: cleared },
      };
    },

    async resyncReadModel(command: ResyncReadModelCommand) {
      try {
        const kinds = resolveKinds(command.kinds, 'rebuildable');
        if (!kinds.length) {
          return fail(SCENARIO_RESYNC_READ_MODELS, 'validation_failure', 'Нет допустимых projection kinds для re-sync.', command.context);
        }

        for (const kind of kinds) {
          const latest = await computeLatestCanonicalEventByKind(deps.db, kind);
          setProjectionReceipt(kind, latest?.type ?? null, latest?.id ?? null);
        }

        const receipts = getProjectionReceipts()
          .filter((row) => kinds.includes(row.kind))
          .map((row) => ({ kind: row.kind, lastTransactionId: row.lastTransactionId, lastEventType: row.lastEventType }));

        return ok(
          SCENARIO_RESYNC_READ_MODELS,
          'Re-sync завершён: receipts синхронизированы с каноническим состоянием.',
          { rebuiltKinds: kinds, receipts },
          command.context,
        );
      } catch (error) {
        return fail(SCENARIO_RESYNC_READ_MODELS, 'unexpected_error', error instanceof Error ? error.message : 'Unexpected resync failure', command.context);
      }
    },

    async checkReadModelConsistency(command?: CheckReadModelConsistencyCommand) {
      try {
        const kinds = resolveKinds(command?.kinds, 'validateable');
        const issues: ConsistencyIssue[] = [];

        for (const kind of kinds) {
          const receipt = getProjectionReceiptByKind(kind);
          if (!receipt) {
            issues.push({
              kind,
              severity: 'blocking',
              code: 'MISSING_RECEIPT',
              message: `Отсутствует projection receipt для ${kind}. Требуется re-sync.`,
            });
            continue;
          }

          if (receipt.stale) {
            issues.push({
              kind,
              severity: 'blocking',
              code: 'STALE_RECEIPT',
              message: `Projection receipt для ${kind} помечен stale.`,
              details: { lastTransactionId: receipt.lastTransactionId },
            });
          }

          if (receipt.lastTransactionId) {
            if (kind === 'catalog' || kind === 'admin') {
              const itemExists = await deps.db.item.findUnique({ where: { id: receipt.lastTransactionId }, select: { id: true } });
              if (!itemExists) {
                issues.push({
                  kind,
                  severity: 'blocking',
                  code: 'RECEIPT_EVENT_NOT_FOUND',
                  message: `Receipt ${kind} ссылается на отсутствующую запись канона.`,
                  details: { lastTransactionId: receipt.lastTransactionId },
                });
              }
            } else {
              const txExists = await deps.db.transaction.findUnique({ where: { id: receipt.lastTransactionId }, select: { id: true, type: true } });
              if (!txExists) {
                issues.push({
                  kind,
                  severity: 'blocking',
                  code: 'RECEIPT_EVENT_NOT_FOUND',
                  message: `Receipt ${kind} ссылается на отсутствующую транзакцию канона.`,
                  details: { lastTransactionId: receipt.lastTransactionId },
                });
              } else if (receipt.lastEventType && txExists.type !== receipt.lastEventType) {
                issues.push({
                  kind,
                  severity: 'blocking',
                  code: 'RECEIPT_TYPE_MISMATCH',
                  message: `Receipt ${kind} содержит тип события, не совпадающий с канонической транзакцией.`,
                  details: { receiptType: receipt.lastEventType, canonicalType: txExists.type, transactionId: txExists.id },
                });
              }
            }
          }
        }

        const reducedEligibilityIssues = await computeReducedEligibilityIssues(deps.db);
        issues.push(...reducedEligibilityIssues);

        const blockingCount = issues.filter((issue) => issue.severity === 'blocking').length;
        const reducedEligibilityCount = issues.filter((issue) => issue.severity === 'reduced_eligibility').length;
        const infoCount = issues.filter((issue) => issue.severity === 'info').length;

        const status =
          blockingCount > 0
            ? 'inconsistent'
            : reducedEligibilityCount > 0
              ? 'consistent_with_reduced_eligibility'
              : 'consistent';

        return {
          ok: true,
          kind: blockingCount === 0 && reducedEligibilityCount === 0 ? 'success' : 'nothing_to_do',
          scenario: SCENARIO_CHECK_CONSISTENCY,
          message:
            status === 'consistent'
              ? 'Touched area согласована.'
              : status === 'consistent_with_reduced_eligibility'
                ? 'Состояние согласовано с допустимым reduced eligibility.'
                : 'Обнаружены blocking inconsistencies в touched area.',
          trace: makeTrace(command?.context),
          data: {
            status,
            checkedKinds: kinds,
            issues,
            blockingCount,
            reducedEligibilityCount,
            infoCount,
            recoveryContract: getReadModelRecoveryContract(),
          },
        };
      } catch (error) {
        return fail(SCENARIO_CHECK_CONSISTENCY, 'unexpected_error', error instanceof Error ? error.message : 'Unexpected consistency check failure', command?.context);
      }
    },
  };
}
