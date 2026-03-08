'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { buildInitialActionRowDraft, hydrateActionRowDraftWithUnits, isActionRowFilled, pickParticipatingRowIds, type ActionRowContext, type ActionRowDraft, validateActionRowDraft } from '@/components/operation/action-row-state';
import { CancelModal } from '@/components/operation/CancelModal';
import { LineEditorModal } from '@/components/operation/LineEditorModal';
import { ResultView } from '@/components/operation/ResultView';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { Toast } from '@/components/ui/Toast';
import { parseRuDateTime } from '@/lib/datetime/ru';
import { cancelLine, cancelTransaction, correctLine, createTransaction, fetchItemUnits, fetchLookup, fetchMovementWorkspace, fetchPolicies } from '@/lib/operation/api';
import { IntakeMode, ItemOption, LookupItem, OperationType, TxLineView, TxResult, UnitOption } from '@/lib/operation/types';

function nowText(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function normalizeTxResult(result: TxResult): TxResult {
  return {
    ...result,
    lines: result.lines.map((line) => ({
      ...line,
      item: line.item ?? { id: '', code: '—', name: 'Неизвестная позиция' },
      unit: line.unit ?? { id: '', name: '—' },
      expenseArticle: line.expenseArticle ?? { id: '', code: '—', name: '—' },
      purpose: line.purpose ?? { id: '', code: '—', name: '—' },
    })),
  };
}

export function OperationForm(): JSX.Element {
  const [type, setType] = useState<OperationType>('IN');
  const [intakeMode, setIntakeMode] = useState<IntakeMode>('SINGLE_PURPOSE');
  const [dateInput, setDateInput] = useState(nowText());
  const [headerPurposeId, setHeaderPurposeId] = useState('');
  const [workspaceSectionId, setWorkspaceSectionId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<ItemOption[]>([]);
  const [unitsByItemId, setUnitsByItemId] = useState<Record<string, UnitOption[]>>({});
  const [rowDrafts, setRowDrafts] = useState<Record<string, ActionRowDraft>>({});
  const [correctUnits, setCorrectUnits] = useState<UnitOption[]>([]);
  const [articles, setArticles] = useState<LookupItem[]>([]);
  const [purposes, setPurposes] = useState<LookupItem[]>([]);
  const [reasons, setReasons] = useState<LookupItem[]>([]);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [result, setResult] = useState<TxResult | null>(null);
  const [toast, setToast] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelLineId, setCancelLineId] = useState('');
  const [correctLineItem, setCorrectLineItem] = useState<TxLineView | null>(null);
  const [policies, setPolicies] = useState({ supervisorBackdateDays: 3, requireReasonOnCancel: true, allowNegativeStock: true, displayDecimals: 2, enablePeriodLocks: false });
  const [warnings, setWarnings] = useState<Array<{ message: string; itemName: string }>>([]);

  const actionContext = useMemo<ActionRowContext>(() => ({
    type,
    intakeMode,
    headerPurposeId,
    workspaceSectionId,
  }), [headerPurposeId, intakeMode, type, workspaceSectionId]);

  const loadLookups = useCallback(async () => {
    const [articleRows, purposeRows, reasonRows] = await Promise.all([fetchLookup('expense-articles'), fetchLookup('purposes'), fetchLookup('reasons')]);
    setArticles(articleRows);
    setPurposes(purposeRows);
    setReasons(reasonRows);
    if (!headerPurposeId && purposeRows[0]) {
      setHeaderPurposeId(purposeRows[0].id);
      setWorkspaceSectionId(purposeRows[0].id);
    }
  }, [headerPurposeId]);

  const loadWorkspaceItems = useCallback(async () => {
    setLoadingWorkspace(true);
    setWorkspaceError('');
    try {
      const found = await fetchMovementWorkspace({ sectionId: workspaceSectionId, q: searchQuery, limit: 120 });
      setItems(found);
      setRowDrafts((prev) => {
        const next: Record<string, ActionRowDraft> = {};
        for (const item of found) {
          next[item.id] = prev[item.id] ?? buildInitialActionRowDraft(item, [], actionContext);
        }
        return next;
      });
    } catch {
      setWorkspaceError('Не удалось загрузить рабочее поле позиций');
    } finally {
      setLoadingWorkspace(false);
    }
  }, [actionContext, workspaceSectionId, searchQuery]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    void fetchPolicies().then(setPolicies).catch(() => null);
  }, []);

  useEffect(() => {
    if (!purposes.length) return;
    void loadWorkspaceItems();
  }, [loadWorkspaceItems, purposes.length]);

  async function ensureItemRowReady(item: ItemOption): Promise<void> {
    if (rowDrafts[item.id]?.unitId && unitsByItemId[item.id]) return;

    setRowDrafts((prev) => ({
      ...prev,
      [item.id]: {
        ...(prev[item.id] ?? { qtyInput: '', unitId: '', expenseArticleId: '', purposeId: '', comment: '', expanded: false, loadingUnits: false, isSubmitting: false, error: '', distributions: [] }),
        loadingUnits: true,
      } as ActionRowDraft,
    }));

    try {
      const unitRows = await fetchItemUnits(item.id);
      setUnitsByItemId((prev) => ({ ...prev, [item.id]: unitRows }));
      setRowDrafts((prev) => ({
        ...prev,
        [item.id]: hydrateActionRowDraftWithUnits({
          currentDraft: prev[item.id],
          item,
          unitRows,
          context: actionContext,
        }),
      }));
    } catch {
      setRowDrafts((prev) => ({
        ...prev,
        [item.id]: {
          ...(prev[item.id] ?? { qtyInput: '', unitId: '', expenseArticleId: item.defaultExpenseArticle.id, purposeId: item.defaultPurpose.id, comment: '', expanded: false, loadingUnits: false, isSubmitting: false, error: '', distributions: [] }),
          loadingUnits: false,
          error: 'Не удалось загрузить единицы этой позиции',
        },
      }));
    }
  }

  function patchRowDraft(itemId: string, patch: Partial<ActionRowDraft>): void {
    setRowDrafts((prev) => {
      if (!prev[itemId]) return prev;
      return { ...prev, [itemId]: { ...prev[itemId], ...patch } };
    });
    if (patch.error === '') setWorkspaceError('');
  }

  async function submitParticipatingRows(): Promise<void> {
    const occurredAt = parseRuDateTime(dateInput);
    if (!occurredAt) return setWorkspaceError('Проверьте дату и время операции');

    const participatingItemIds = pickParticipatingRowIds(rowDrafts);
    if (participatingItemIds.length === 0) {
      setWorkspaceError('Заполните минимум одну строку, чтобы провести движение');
      return;
    }

    const invalidItemIds: string[] = [];
    for (const itemId of participatingItemIds) {
      const row = rowDrafts[itemId];
      if (!row) continue;
      const validationError = validateActionRowDraft(row);
      if (validationError) {
        invalidItemIds.push(itemId);
        patchRowDraft(itemId, { error: validationError });
      }
    }

    if (invalidItemIds.length > 0) {
      setWorkspaceError('Проведение остановлено: исправьте ошибки в отмеченных строках');
      return;
    }

    setWorkspaceError('');
    setRowDrafts((prev) => {
      const next = { ...prev };
      for (const itemId of participatingItemIds) {
        if (!next[itemId]) continue;
        next[itemId] = { ...next[itemId], isSubmitting: true, error: '' };
      }
      return next;
    });

    try {
      const saved = await createTransaction({
        type,
        occurredAt: occurredAt.toISOString(),
        intakeMode,
        headerPurposeId,
        lines: participatingItemIds.map((itemId) => {
          const row = rowDrafts[itemId]!;
          return {
            itemId,
            qtyInput: row.qtyInput,
            unitId: row.unitId,
            expenseArticleId: row.expenseArticleId,
            purposeId: row.purposeId,
            comment: row.comment,
            distributions: row.distributions,
          };
        }),
      });

      const normalized = normalizeTxResult(saved);
      setResult(normalized);
      setWarnings(saved.warnings ?? []);
      setToast(participatingItemIds.length === 1 ? 'Позиция проведена' : `Проведено строк: ${participatingItemIds.length}`);
      setRowDrafts((prev) => {
        const next = { ...prev };
        for (const itemId of participatingItemIds) {
          const row = next[itemId];
          if (!row) continue;
          next[itemId] = { ...row, qtyInput: '', comment: '', distributions: [], isSubmitting: false, error: '' };
        }
        return next;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось провести движение';
      setWorkspaceError(message);
      setRowDrafts((prev) => {
        const next = { ...prev };
        for (const itemId of participatingItemIds) {
          const row = next[itemId];
          if (!row) continue;
          next[itemId] = { ...row, isSubmitting: false, error: row.error || message };
        }
        return next;
      });
    }
  }

  async function submitCancel(payload: { reasonId?: string; cancelNote?: string }): Promise<void> {
    if (!result) return;
    try {
      if (cancelLineId) {
        await cancelLine(cancelLineId, payload);
      } else {
        await cancelTransaction(result.transaction.id, payload);
      }
      setToast(cancelLineId ? 'Строка отменена' : 'Операция отменена');
      setCancelOpen(false);
      setCancelLineId('');
      setResult(null);
      setWarnings([]);
    } catch (err) {
      setWorkspaceError(err instanceof Error ? err.message : 'Ошибка отмены');
    }
  }

  async function submitCorrection(payload: Record<string, unknown>): Promise<void> {
    if (!correctLineItem) return;
    try {
      await correctLine(correctLineItem.id, payload);
      setCorrectLineItem(null);
      setToast('Исправление проведено');
    } catch (err) {
      setWorkspaceError(err instanceof Error ? err.message : 'Ошибка исправления');
    }
  }

  async function openCorrectModal(line: TxLineView): Promise<void> {
    const lineUnits = await fetchItemUnits(line.item.id);
    setCorrectUnits(lineUnits);
    setCorrectLineItem(line);
  }

  return (
    <section className="space-y-4" data-testid="movements-hub-page">
      <h1 className="text-2xl font-semibold">Движения</h1>

      <Card>
        <CardHeader>
          <CardTitle>Рабочий контекст</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tabs value={type} onChange={(value) => setType(value)} items={[{ value: 'IN', label: 'Приход' }, { value: 'OUT', label: 'Расход' }, { value: 'ADJUST', label: 'Коррекция' }]} getItemTestId={(item) => (item.value === 'IN' ? 'op-tab-in' : item.value === 'OUT' ? 'op-tab-out' : 'op-tab-adjust')} />
          <Input label="Дата и время" value={dateInput} onChange={(event) => setDateInput(event.target.value)} helperText="Примеры: 1.3.26 или 01.03.2026 12:30" data-testid="op-datetime" />
          {type === 'IN' ? <Tabs value={intakeMode} onChange={(value) => setIntakeMode(value)} items={[{ value: 'SINGLE_PURPOSE', label: 'Одно назначение' }, { value: 'DISTRIBUTE_PURPOSES', label: 'Распределить' }]} getItemTestId={(item) => (item.value === 'SINGLE_PURPOSE' ? 'op-intake-single' : 'op-intake-distribute')} /> : null}
          {type === 'IN' && intakeMode === 'SINGLE_PURPOSE' ? <Select label="Назначение для прихода" value={headerPurposeId} onChange={(event) => setHeaderPurposeId(event.target.value)} data-testid="op-header-purpose">{purposes.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select> : null}
          <Select label="Раздел рабочего поля" value={workspaceSectionId} onChange={(event) => setWorkspaceSectionId(event.target.value)} data-testid="movements-section-select">
            {purposes.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Рабочее поле позиций</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input label="Поиск в текущем разделе" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} data-testid="op-item-search" />
            <Button className="mt-7" variant="secondary" onClick={() => setSearchQuery(searchInput)} data-testid="op-search-item">Найти</Button>
            <Button className="mt-7" variant="ghost" onClick={() => { setSearchInput(''); setSearchQuery(''); }}>Сброс</Button>
          </div>
          <p className="text-xs text-muted">Поиск остаётся вспомогательным: рабочее поле строится по выбранному разделу, а участие строки определяется фактом ввода количества.</p>
          {loadingWorkspace ? <p className="text-sm text-muted">Загрузка позиций...</p> : null}
          <div className="space-y-2" data-testid="movements-workspace-list">
            {items.map((item) => {
              const row = rowDrafts[item.id];
              const unitOptions = unitsByItemId[item.id] ?? [];
              const showUnitSelect = unitOptions.length > 1;
              const selectedUnitName = unitOptions.find((unit) => unit.unitId === row?.unitId)?.unit.name;
              const participates = row ? isActionRowFilled(row) : false;

              return (
                <article key={item.id} className="rounded-xl border border-border bg-bg p-3" data-testid={`movements-item-${item.id}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{item.code} — {item.name}</p>
                      <p className="text-xs text-muted">Статья по умолчанию: {item.defaultExpenseArticle.code} — {item.defaultExpenseArticle.name}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { void ensureItemRowReady(item); patchRowDraft(item.id, { expanded: !row?.expanded }); }} data-testid={`op-row-more-${item.id}`}>
                      {row?.expanded ? 'Скрыть детали' : 'Доп. параметры'}
                    </Button>
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-[140px_1fr_auto] md:items-end">
                    <Input
                      label="Количество"
                      inputMode="decimal"
                      value={row?.qtyInput ?? ''}
                      onFocus={() => { void ensureItemRowReady(item); }}
                      onChange={(event) => patchRowDraft(item.id, { qtyInput: event.target.value, error: '' })}
                      errorText={row?.error.includes('количество') ? row.error : undefined}
                      data-testid={`op-qty-${item.id}`}
                    />

                    {showUnitSelect ? (
                      <Select
                        label="Единица"
                        value={row?.unitId ?? ''}
                        onFocus={() => { void ensureItemRowReady(item); }}
                        onChange={(event) => patchRowDraft(item.id, { unitId: event.target.value, error: '' })}
                        errorText={row?.error.includes('единицу') ? row.error : undefined}
                        data-testid={`op-unit-${item.id}`}
                      >
                        {unitOptions.map((unit) => <option key={unit.id} value={unit.unitId}>{unit.unit.name}</option>)}
                      </Select>
                    ) : (
                      <div className="rounded-md border border-border bg-surface p-3 text-sm" data-testid={`op-unit-single-${item.id}`}>
                        Единица: {selectedUnitName ?? '—'}
                      </div>
                    )}

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => { void ensureItemRowReady(item); }}
                      loading={Boolean(row?.isSubmitting)}
                      data-testid={`op-row-submit-${item.id}`}
                    >
                      Готово к проведению
                    </Button>
                  </div>

                  {row?.expanded ? (
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      <Select label="Статья расходов" value={row.expenseArticleId} onChange={(event) => patchRowDraft(item.id, { expenseArticleId: event.target.value })}>
                        {articles.map((article) => <option key={article.id} value={article.id}>{article.code} — {article.name}</option>)}
                      </Select>
                      <Select label="Назначение" value={row.purposeId} onChange={(event) => patchRowDraft(item.id, { purposeId: event.target.value })}>
                        {purposes.map((purpose) => <option key={purpose.id} value={purpose.id}>{purpose.code} — {purpose.name}</option>)}
                      </Select>
                      <Input className="md:col-span-2" label="Комментарий" value={row.comment} onChange={(event) => patchRowDraft(item.id, { comment: event.target.value })} />
                    </div>
                  ) : null}

                  <p className="mt-2 text-xs text-muted">{participates ? 'Строка участвует в проведении' : 'Пустая строка не участвует в проведении'}</p>
                  {row?.error && !row.error.includes('количество') && !row.error.includes('единицу') ? <p className="mt-2 text-xs text-critical">{row.error}</p> : null}
                  {row?.loadingUnits ? <p className="mt-2 text-xs text-muted">Загружаем единицы...</p> : null}
                </article>
              );
            })}
          </div>
          {!loadingWorkspace && items.length === 0 ? <p className="text-sm text-muted">В этом разделе нет активных позиций.</p> : null}
        </CardContent>
      </Card>

      {workspaceError ? <p className="text-sm text-critical">{workspaceError}</p> : null}
      <Button onClick={() => { void submitParticipatingRows(); }} data-testid="op-save">Провести заполненные строки</Button>
      {warnings.length > 0 ? <div className="rounded border border-warn p-3 text-sm">Внимание: списание увело остаток в минус<ul className="list-inside list-disc">{warnings.map((w) => <li key={w.itemName}>{w.itemName}</li>)}</ul></div> : null}

      {result ? <ResultView transaction={result.transaction} lines={result.lines} onCancelTx={() => setCancelOpen(true)} onCancelLine={(lineId) => { setCancelLineId(lineId); setCancelOpen(true); }} onCorrectLine={(line) => { void openCorrectModal(line); }} /> : null}
      {toast ? <Toast message={toast} onClose={() => setToast('')} /> : null}

      <CancelModal open={cancelOpen} reasons={reasons} requireReason={policies.requireReasonOnCancel} onClose={() => { setCancelOpen(false); setCancelLineId(''); }} onSubmit={(payload) => { void submitCancel(payload); }} />
      <LineEditorModal open={Boolean(correctLineItem)} mode="correct" units={correctUnits} articles={articles} purposes={purposes} reasons={reasons} requireReason={policies.requireReasonOnCancel} initial={correctLineItem ? { qtyInput: String(correctLineItem.qtyInput), unitId: correctLineItem.unit.id, expenseArticleId: correctLineItem.expenseArticle.id, purposeId: correctLineItem.purpose.id, comment: correctLineItem.comment ?? '' } : {}} onClose={() => setCorrectLineItem(null)} onSubmit={(payload) => { void submitCorrection(payload); }} />
    </section>
  );
}
