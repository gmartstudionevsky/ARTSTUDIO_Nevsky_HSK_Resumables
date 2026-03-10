'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { buildInitialActionRowDraft, getSecondLayerEligibilityHints, hasSecondLayerPayload, hydrateActionRowDraftWithUnits, isActionRowFilled, pickParticipatingRowIds, type ActionRowContext, type ActionRowDraft, validateActionRowDraft } from '@/components/operation/action-row-state';
import { CancelModal } from '@/components/operation/CancelModal';
import { LineEditorModal } from '@/components/operation/LineEditorModal';
import { buildCorrectionPatch, buildPostActionState, canPrepareCorrection, PostActionState } from '@/components/operation/post-action-state';
import { ResultView } from '@/components/operation/ResultView';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { Toast } from '@/components/ui/Toast';
import { parseRuDateTime } from '@/lib/datetime/ru';
import { cancelLine, cancelTransaction, correctLine, createTransaction, fetchItemUnits, fetchLookup, fetchMovementWorkspace, fetchPolicies, rollbackMovement } from '@/lib/operation/api';
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
      accountingPosition: line.accountingPosition ?? { id: '', code: '—', name: 'Неизвестная позиция' },
      unit: line.unit ?? { id: '', name: '—' },
      expenseArticle: line.expenseArticle ?? { id: '', code: '—', name: '—' },
      section: line.section ?? { id: '', code: '—', name: '—' },
    })),
  };
}


export function resolveParticipatingItemIds(params: {
  rowDrafts: Record<string, ActionRowDraft>;
  onlyItemId?: string;
}): string[] {
  if (params.onlyItemId) {
    const row = params.rowDrafts[params.onlyItemId];
    return row && isActionRowFilled(row) ? [params.onlyItemId] : [];
  }

  return pickParticipatingRowIds(params.rowDrafts);
}

export function OperationForm(): JSX.Element {
  const [type, setType] = useState<OperationType>('IN');
  const [intakeMode, setIntakeMode] = useState<IntakeMode>('SINGLE_SECTION');
  const [dateInput, setDateInput] = useState(nowText());
  const [headerSectionId, setHeaderSectionId] = useState('');
  const [workspaceSectionId, setWorkspaceSectionId] = useState('');
  const [pendingSectionId, setPendingSectionId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<ItemOption[]>([]);
  const [unitsByItemId, setUnitsByItemId] = useState<Record<string, UnitOption[]>>({});
  const [rowDrafts, setRowDrafts] = useState<Record<string, ActionRowDraft>>({});
  const [correctUnits, setCorrectUnits] = useState<UnitOption[]>([]);
  const [articles, setArticles] = useState<LookupItem[]>([]);
  const [sections, setSections] = useState<LookupItem[]>([]);
  const [reasons, setReasons] = useState<LookupItem[]>([]);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [postAction, setPostAction] = useState<PostActionState | null>(null);
  const [toast, setToast] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelLineId, setCancelLineId] = useState('');
  const [correctLineItem, setCorrectLineItem] = useState<TxLineView | null>(null);
  const [policies, setPolicies] = useState({ supervisorBackdateDays: 3, requireReasonOnCancel: true, allowNegativeStock: true, displayDecimals: 2, enablePeriodLocks: false });
  const [warnings, setWarnings] = useState<NonNullable<TxResult['warnings']>>([]);
  const [rollbackBusy, setRollbackBusy] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(true);

  const actionContext = useMemo<ActionRowContext>(() => ({
    type,
    intakeMode,
    headerSectionId,
    workspaceSectionId,
  }), [headerSectionId, intakeMode, type, workspaceSectionId]);

  const loadLookups = useCallback(async () => {
    const [articleRows, sectionRows, reasonRows] = await Promise.all([fetchLookup('expense-articles'), fetchLookup('sections'), fetchLookup('reasons')]);
    setArticles(articleRows);
    setSections(sectionRows);
    setReasons(reasonRows);
    if (!headerSectionId && sectionRows[0]) {
      setHeaderSectionId(sectionRows[0].id);
      setWorkspaceSectionId(sectionRows[0].id);
      setPendingSectionId(sectionRows[0].id);
    }
  }, [headerSectionId]);

  useEffect(() => {
    if (!workspaceSectionId) return;
    if (!pendingSectionId) {
      setPendingSectionId(workspaceSectionId);
    }
  }, [pendingSectionId, workspaceSectionId]);

  useEffect(() => {
    if (type !== 'IN' || intakeMode !== 'SINGLE_SECTION' || !workspaceSectionId) return;
    setHeaderSectionId(workspaceSectionId);
  }, [intakeMode, type, workspaceSectionId]);

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
    if (!sections.length) return;
    void loadWorkspaceItems();
  }, [loadWorkspaceItems, sections.length]);

  async function ensureItemRowReady(item: ItemOption): Promise<void> {
    if (rowDrafts[item.id]?.unitId && unitsByItemId[item.id]) return;

    setRowDrafts((prev) => ({
      ...prev,
      [item.id]: {
        ...(prev[item.id] ?? { qtyInput: '', unitId: '', expenseArticleId: '', sectionId: '', comment: '', expanded: false, secondLayerExpanded: false, showEligibilityHint: false, showControlledParameters: false, loadingUnits: false, isSubmitting: false, error: '', distributions: [] }),
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
          ...(prev[item.id] ?? { qtyInput: '', unitId: '', expenseArticleId: item.defaultExpenseArticle.id, sectionId: item.defaultSection.id, comment: '', expanded: false, secondLayerExpanded: false, showEligibilityHint: false, showControlledParameters: false, loadingUnits: false, isSubmitting: false, error: '', distributions: [] }),
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

  async function submitParticipatingRows(onlyItemId?: string): Promise<void> {
    const occurredAt = parseRuDateTime(dateInput);
    if (!occurredAt) return setWorkspaceError('Проверьте дату и время операции');

    const participatingItemIds = resolveParticipatingItemIds({ rowDrafts, onlyItemId });
    if (participatingItemIds.length === 0) {
      setWorkspaceError(onlyItemId ? 'Заполните количество в строке перед проведением' : 'Заполните минимум одну строку, чтобы провести движение');
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
        intakeMode: intakeMode === 'SINGLE_SECTION' ? 'SINGLE_SECTION' : 'DISTRIBUTE_SECTIONS',
        headerSectionId: headerSectionId,
        lines: participatingItemIds.map((itemId) => {
          const row = rowDrafts[itemId]!;
          return {
            accountingPositionId: itemId,
            qtyInput: row.qtyInput,
            unitId: row.unitId,
            expenseArticleId: row.expenseArticleId,
            sectionId: row.sectionId,
            comment: row.comment,
            sectionDistributions: row.distributions.map((d) => ({ sectionId: d.sectionId, qtyInput: d.qtyInput })),
          };
        }),
      });

      const normalized = normalizeTxResult(saved);
      setPostAction(buildPostActionState(normalized, participatingItemIds));
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
    if (!postAction) return;
    try {
      if (cancelLineId) {
        await cancelLine(cancelLineId, payload);
      } else {
        await cancelTransaction(postAction.result.transaction.id, payload);
      }
      setToast(cancelLineId ? 'Строка отменена' : 'Операция отменена');
      setCancelOpen(false);
      setCancelLineId('');
      setPostAction(null);
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
    const lineUnits = await fetchItemUnits(line.accountingPosition.id);
    setCorrectUnits(lineUnits);
    setCorrectLineItem(line);
  }

  async function rollbackLastAction(): Promise<void> {
    if (!postAction) return;
    setRollbackBusy(true);
    try {
      await rollbackMovement(postAction.result.transaction.id, {});
      setToast('Последнее действие откачено локально');
      setPostAction(null);
      setWarnings([]);
      setWorkspaceError('');
    } catch (err) {
      setWorkspaceError(err instanceof Error ? err.message : 'Rollback недоступен');
    } finally {
      setRollbackBusy(false);
    }
  }

  async function hydrateLineForCorrection(line: TxLineView): Promise<void> {
    if (!canPrepareCorrection(line, rowDrafts)) {
      setWorkspaceError('Позиция недоступна в текущем разделе рабочего поля. Используйте модальный корректор.');
      return;
    }

    const workspaceItem = items.find((item) => item.id === line.accountingPosition.id);
    if (!workspaceItem) return;

    await ensureItemRowReady(workspaceItem);
    patchRowDraft(line.accountingPosition.id, buildCorrectionPatch(line));
    setToast('Строка перенесена в рабочее поле для коррекции');
  }

  const participatingItemIds = useMemo(() => resolveParticipatingItemIds({ rowDrafts }), [rowDrafts]);
  const canApplyRows = participatingItemIds.length > 0;
  const sectionTabs = sections.map((section) => ({ value: section.id, label: `${section.code} · ${section.name}` }));

  return (
    <section className="space-y-4" data-testid="movements-hub-page">
      <h1 className="text-2xl font-semibold">Движения</h1>

      <Card className="sticky top-3 z-10 border-accent/20 shadow-[0_16px_32px_rgba(17,24,39,0.08)]" data-testid="movements-sticky-rail">
        <CardContent className="space-y-3 p-3">
          <Tabs value={type} onChange={(value) => setType(value)} items={[{ value: 'IN', label: 'Приход' }, { value: 'OUT', label: 'Расход' }, { value: 'ADJUST', label: 'Коррекция' }]} getItemTestId={(item) => (item.value === 'IN' ? 'op-tab-in' : item.value === 'OUT' ? 'op-tab-out' : 'op-tab-adjust')} />

          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Раздел позиций учёта</p>
              {sectionTabs.length > 0 ? (
                <Tabs value={pendingSectionId || workspaceSectionId} onChange={(value) => setPendingSectionId(value)} items={sectionTabs} getItemTestId={(item) => (item.value === workspaceSectionId ? 'movements-section-select' : undefined)} />
              ) : (
                <p className="text-sm text-muted">Разделы загружаются…</p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted">Выбрано к применению: {canApplyRows ? participatingItemIds.length : 0} строк.</p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setWorkspaceSectionId(pendingSectionId)}
                  disabled={!pendingSectionId || pendingSectionId === workspaceSectionId}
                  data-testid="movements-apply-section"
                >
                  Применить раздел
                </Button>
                <Button
                  onClick={() => { void submitParticipatingRows(); }}
                  disabled={!canApplyRows}
                  className={canApplyRows ? 'shadow-[0_12px_26px_rgba(227,174,90,0.34)]' : ''}
                  data-testid="op-save"
                >
                  Применить
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-3">
          <Button variant="ghost" size="sm" onClick={() => setAdvancedOpen((prev) => !prev)}>
            {advancedOpen ? 'Скрыть дополнительные параметры' : 'Показать дополнительные параметры'}
          </Button>

          {advancedOpen ? (
            <div className="space-y-3 rounded-xl border border-border bg-surface p-3">
              <Input label="Дата и время" value={dateInput} onChange={(event) => setDateInput(event.target.value)} helperText="Примеры: 1.3.26 или 01.03.2026 12:30" data-testid="op-datetime" />
              {type === 'IN' ? <Tabs value={intakeMode} onChange={(value) => setIntakeMode(value)} items={[{ value: 'SINGLE_SECTION', label: 'Один раздел' }, { value: 'DISTRIBUTE_SECTIONS', label: 'Распределить' }]} getItemTestId={(item) => (item.value === 'SINGLE_SECTION' ? 'op-intake-single' : 'op-intake-distribute')} /> : null}
              {type === 'IN' && intakeMode === 'SINGLE_SECTION' ? <Select label="Раздел для прихода" value={headerSectionId} onChange={(event) => setHeaderSectionId(event.target.value)} data-testid="op-header-section">{sections.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select> : null}
              <div className="flex gap-2">
                <Input label="Поиск в текущем разделе" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} data-testid="op-item-search" />
                <Button className="mt-7" variant="secondary" onClick={() => setSearchQuery(searchInput)} data-testid="op-search-item">Найти</Button>
                <Button className="mt-7" variant="ghost" onClick={() => { setSearchInput(''); setSearchQuery(''); }}>Сброс</Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Рабочее поле позиций</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted">Поиск остаётся вспомогательным: рабочее поле строится по выбранному разделу, а участие строки определяется фактом ввода количества.</p>
          {loadingWorkspace ? <p className="text-sm text-muted">Загрузка позиций...</p> : null}
          <div className="space-y-2" data-testid="movements-workspace-list">
            {items.map((item) => {
              const row = rowDrafts[item.id];
              const unitOptions = unitsByItemId[item.id] ?? [];
              const showUnitSelect = unitOptions.length > 1;
              const selectedUnitName = unitOptions.find((unit) => unit.unitId === row?.unitId)?.unit.name;
              const participates = row ? isActionRowFilled(row) : false;
              const secondLayerHints = getSecondLayerEligibilityHints(item);
              const secondLayerAvailable = hasSecondLayerPayload(item);

              return (
                <article key={item.id} className="scroll-mt-40 rounded-xl border border-border bg-bg p-3" data-testid={`movements-item-${item.id}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{item.code} — {item.name}</p>
                      <p className="text-xs text-muted">Статья по умолчанию: {item.defaultExpenseArticle.code} — {item.defaultExpenseArticle.name}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="ghost" onClick={() => { void ensureItemRowReady(item); patchRowDraft(item.id, { expanded: !row?.expanded }); }} data-testid={`op-row-more-${item.id}`}>
                        {row?.expanded ? 'Скрыть детали' : 'Доп. параметры'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          void ensureItemRowReady(item);
                          patchRowDraft(item.id, { secondLayerExpanded: !row?.secondLayerExpanded });
                        }}
                        data-testid={`op-row-second-layer-${item.id}`}
                      >
                        {row?.secondLayerExpanded ? 'Скрыть 2-й слой' : '2-й слой'}
                      </Button>
                    </div>
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
                      className="relative z-20 scroll-mt-40"
                      onClick={() => {
                        void ensureItemRowReady(item).then(() => submitParticipatingRows(item.id));
                      }}
                      loading={Boolean(row?.isSubmitting)}
                      data-testid={`op-row-submit-${item.id}`}
                    >
                      Провести
                    </Button>
                  </div>

                  {row?.expanded ? (
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      <Select label="Статья затрат" value={row.expenseArticleId} onChange={(event) => patchRowDraft(item.id, { expenseArticleId: event.target.value })}>
                        {articles.map((article) => <option key={article.id} value={article.id}>{article.code} — {article.name}</option>)}
                      </Select>
                      <Select label="Раздел" value={row.sectionId} onChange={(event) => patchRowDraft(item.id, { sectionId: event.target.value })}>
                        {sections.map((purpose) => <option key={purpose.id} value={purpose.id}>{purpose.code} — {purpose.name}</option>)}
                      </Select>
                      <Input className="md:col-span-2" label="Комментарий" value={row.comment} onChange={(event) => patchRowDraft(item.id, { comment: event.target.value })} />
                    </div>
                  ) : null}

                  {row?.secondLayerExpanded ? (
                    <div className="mt-3 space-y-3 rounded-lg border border-border bg-surface p-3" data-testid={`op-row-second-layer-panel-${item.id}`}>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted">Локальный второй слой</p>
                      {secondLayerAvailable ? (
                        <div className="grid gap-2 md:grid-cols-2">
                          <div className="rounded-md border border-border bg-bg px-3 py-2 text-xs">
                            Аналитика раздела: {item.analytics?.section?.name ?? 'Недоступна'}
                          </div>
                          <div className="rounded-md border border-border bg-bg px-3 py-2 text-xs">
                            Аналитика статьи: {item.analytics?.expenseArticle?.name ?? item.defaultExpenseArticle.name}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted">Для позиции доступен только action-ready слой, расширенная аналитика не требуется.</p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => patchRowDraft(item.id, { showEligibilityHint: !row.showEligibilityHint })}
                          data-testid={`op-row-hints-toggle-${item.id}`}
                        >
                          {row?.showEligibilityHint ? 'Скрыть пояснения' : 'Показать пояснения'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => patchRowDraft(item.id, { showControlledParameters: !row.showControlledParameters })}
                          data-testid={`op-row-controlled-toggle-${item.id}`}
                        >
                          {row?.showControlledParameters ? 'Скрыть параметры' : 'Управляемые параметры'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => patchRowDraft(item.id, { qtyInput: '', comment: '', distributions: [], error: '' })}
                          data-testid={`op-row-reset-draft-${item.id}`}
                        >
                          Сбросить draft
                        </Button>
                      </div>

                      {row?.showControlledParameters ? (
                        <div className="rounded-md border border-border bg-bg p-3 text-xs" data-testid={`op-row-controlled-panel-${item.id}`}>
                          {item.analytics?.availability?.controlledParameters === 'disabled'
                            ? 'Слой controlledParameters отключён для позиции.'
                            : item.analytics?.controlledParameters?.valuesCount
                              ? `Значения controlledParameters: ${item.analytics.controlledParameters.valuesCount}`
                              : 'Управляемые параметры доступны как extension point и сейчас не заполнены.'}
                        </div>
                      ) : null}

                      {row?.showEligibilityHint && secondLayerHints.length > 0 ? (
                        <ul className="space-y-1 text-xs text-muted" data-testid={`op-row-hints-${item.id}`}>
                          {secondLayerHints.map((hint) => <li key={hint}>• {hint}</li>)}
                        </ul>
                      ) : null}
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
      {warnings.length > 0 ? <div className="rounded border border-warn p-3 text-sm">Внимание: списание увело остаток в минус<ul className="list-inside list-disc">{warnings.map((w) => <li key={w.accountingPositionName}>{w.accountingPositionName}</li>)}</ul></div> : null}

      {postAction ? (
        <ResultView
          transaction={postAction.result.transaction}
          lines={postAction.result.lines}
          participatingItemIds={postAction.participatingItemIds}
          mode={postAction.mode}
          rollbackAvailable={Boolean(postAction.result.transaction.type === 'IN' || postAction.result.transaction.type === 'OUT' || postAction.result.transaction.type === 'ADJUST')}
          rollbackBusy={rollbackBusy}
          correctionHint="Быстрая коррекция переносит недавнюю строку обратно в рабочее поле текущего хаба без перехода в историю."
          onRollbackTx={() => { void rollbackLastAction(); }}
          onHydrateLineForCorrection={(line) => { void hydrateLineForCorrection(line); }}
          onCancelLine={(lineId) => { setCancelLineId(lineId); setCancelOpen(true); }}
          onCorrectLine={(line) => { void openCorrectModal(line); }}
        />
      ) : null}
      {toast ? <Toast message={toast} onClose={() => setToast('')} /> : null}

      <CancelModal open={cancelOpen} reasons={reasons} requireReason={policies.requireReasonOnCancel} onClose={() => { setCancelOpen(false); setCancelLineId(''); }} onSubmit={(payload) => { void submitCancel(payload); }} />
      <LineEditorModal open={Boolean(correctLineItem)} mode="correct" units={correctUnits} articles={articles} sections={sections} reasons={reasons} requireReason={policies.requireReasonOnCancel} initial={correctLineItem ? { qtyInput: String(correctLineItem.qtyInput), unitId: correctLineItem.unit.id, expenseArticleId: correctLineItem.expenseArticle.id, sectionId: correctLineItem.section.id, comment: correctLineItem.comment ?? '' } : {}} onClose={() => setCorrectLineItem(null)} onSubmit={(payload) => { void submitCorrection(payload); }} />
    </section>
  );
}
