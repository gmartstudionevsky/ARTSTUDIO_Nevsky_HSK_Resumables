'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { BatchLinesList } from '@/components/operation/BatchLinesList';
import { CancelModal } from '@/components/operation/CancelModal';
import { DistributePurposesModal } from '@/components/operation/DistributePurposesModal';
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
import { BatchLineDraft, IntakeMode, ItemOption, LookupItem, OperationType, TxLineView, TxResult, UnitOption } from '@/lib/operation/types';

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
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [correctUnits, setCorrectUnits] = useState<UnitOption[]>([]);
  const [articles, setArticles] = useState<LookupItem[]>([]);
  const [purposes, setPurposes] = useState<LookupItem[]>([]);
  const [reasons, setReasons] = useState<LookupItem[]>([]);
  const [draft, setDraft] = useState({ itemId: '', qtyInput: '', unitId: '', expenseArticleId: '', purposeId: '', comment: '' });
  const [lines, setLines] = useState<BatchLineDraft[]>([]);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TxResult | null>(null);
  const [toast, setToast] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelLineId, setCancelLineId] = useState('');
  const [editLine, setEditLine] = useState<BatchLineDraft | null>(null);
  const [distributeLine, setDistributeLine] = useState<BatchLineDraft | null>(null);
  const [correctLineItem, setCorrectLineItem] = useState<TxLineView | null>(null);
  const [policies, setPolicies] = useState({ supervisorBackdateDays: 3, requireReasonOnCancel: true, allowNegativeStock: true, displayDecimals: 2, enablePeriodLocks: false });
  const [warnings, setWarnings] = useState<Array<{ message: string; itemName: string }>>([]);

  const selectedItem = useMemo(() => items.find((item) => item.id === draft.itemId), [items, draft.itemId]);

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
    try {
      const found = await fetchMovementWorkspace({ sectionId: workspaceSectionId, q: searchQuery, limit: 120 });
      setItems(found);
    } catch {
      setError('Не удалось загрузить рабочее поле позиций');
    } finally {
      setLoadingWorkspace(false);
    }
  }, [workspaceSectionId, searchQuery]);

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

  async function onSelectItem(itemId: string): Promise<void> {
    setDraft((prev) => ({ ...prev, itemId }));
    const item = items.find((entry) => entry.id === itemId);
    const unitRows = await fetchItemUnits(itemId);
    setUnits(unitRows);
    setDraft((prev) => ({
      ...prev,
      itemId,
      qtyInput: prev.qtyInput || '1',
      unitId: unitRows.find((unit) => unit.isDefaultInput)?.unitId ?? unitRows[0]?.unitId ?? '',
      expenseArticleId: item?.defaultExpenseArticle.id ?? '',
      purposeId: type === 'IN' && intakeMode === 'SINGLE_PURPOSE' && headerPurposeId ? headerPurposeId : item?.defaultPurpose.id ?? workspaceSectionId,
    }));
  }

  function addLine(): void {
    setError('');
    if (!draft.itemId || Number(draft.qtyInput) <= 0 || !draft.unitId) return setError('Заполните позицию, количество и единицу');
    const item = items.find((entry) => entry.id === draft.itemId);
    const unit = units.find((entry) => entry.unitId === draft.unitId);
    const article = articles.find((entry) => entry.id === draft.expenseArticleId);
    const purpose = purposes.find((entry) => entry.id === draft.purposeId);
    if (!item || !unit) return setError('Позиция или единица не найдены');

    const line: BatchLineDraft = {
      localId: crypto.randomUUID(),
      itemId: draft.itemId,
      itemLabel: `${item.code} — ${item.name}`,
      qtyInput: draft.qtyInput,
      unitId: draft.unitId,
      unitName: unit.unit.name,
      expenseArticleId: draft.expenseArticleId,
      expenseArticleLabel: article ? `${article.code} — ${article.name}` : '-',
      purposeId: draft.purposeId,
      purposeLabel: purpose ? `${purpose.code} — ${purpose.name}` : 'наследуется',
      comment: draft.comment,
    };

    setLines((prev) => [...prev, line]);
    setDraft((prev) => ({ ...prev, qtyInput: '', comment: '' }));
  }

  async function save(): Promise<void> {
    setError('');
    if (!lines.length) return;
    const parsedDate = parseRuDateTime(dateInput);
    if (!parsedDate) return setError('Некорректная дата/время');

    try {
      const payload = {
        type,
        occurredAt: parsedDate.toISOString(),
        intakeMode: type === 'IN' ? intakeMode : undefined,
        headerPurposeId: type === 'IN' && intakeMode === 'SINGLE_PURPOSE' ? headerPurposeId : undefined,
        lines: lines.map((line) => ({
          itemId: line.itemId,
          qtyInput: line.qtyInput,
          unitId: line.unitId,
          expenseArticleId: line.expenseArticleId || undefined,
          purposeId: line.purposeId || undefined,
          comment: line.comment || undefined,
          distributions: line.distributions?.map((entry) => ({ purposeId: entry.purposeId, qtyInput: entry.qtyInput })),
        })),
      };
      const created = normalizeTxResult(await createTransaction(payload));
      setResult(created);
      setWarnings((created.warnings ?? []).map((w) => ({ message: w.message, itemName: w.itemName })));
      setToast('Операция записана');
      setLines([]);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Ошибка сохранения';
      if (message.includes('Супервайзеру доступен ввод задним числом')) {
        setError(`Нельзя сохранить: доступен ввод только на ${policies.supervisorBackdateDays} дн.`);
      } else if (message.includes('Период закрыт')) {
        setError('Период закрыт. Создание операции запрещено.');
      } else {
        setError(message);
      }
    }
  }

  async function submitCancel(payload: { reasonId?: string; cancelNote?: string }): Promise<void> {
    if (!result) return;
    try {
      if (cancelLineId) {
        await cancelLine(cancelLineId, payload);
        setResult((prev) => (prev ? { ...prev, lines: prev.lines.map((line) => (line.id === cancelLineId ? { ...line, status: 'CANCELLED' as const } : line)) } : prev));
      } else {
        await cancelTransaction(result.transaction.id, payload);
        setResult((prev) => (prev ? { ...prev, lines: prev.lines.map((line) => ({ ...line, status: 'CANCELLED' as const })) } : prev));
      }
      setCancelOpen(false);
      setCancelLineId('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка отмены');
    }
  }

  async function submitCorrection(payload: Record<string, string>): Promise<void> {
    if (!correctLineItem) return;
    try {
      const created = await correctLine(correctLineItem.id, payload);
      setResult((prev) => (prev ? { ...prev, lines: [...prev.lines.map((line) => (line.id === correctLineItem.id ? { ...line, status: 'CANCELLED' as const } : line)), created.line] } : prev));
      setCorrectLineItem(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка исправления');
    }
  }

  async function openCorrectModal(line: TxLineView): Promise<void> {
    const lineUnits = (await fetchItemUnits(line.item.id)) as UnitOption[];
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

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
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
            <p className="text-xs text-muted">Список позиций загружается сразу по выбранному разделу. Поиск только сужает текущее поле.</p>
            {loadingWorkspace ? <p className="text-sm text-muted">Загрузка позиций...</p> : null}
            <div className="space-y-2" data-testid="movements-workspace-list">
              {items.map((item) => {
                const isSelected = draft.itemId === item.id;
                return (
                  <button key={item.id} type="button" className={`w-full rounded-lg border p-3 text-left ${isSelected ? 'border-primary bg-surface-2' : 'border-border'}`} onClick={() => { void onSelectItem(item.id); }} data-testid={`movements-item-${item.id}`}>
                    <p className="text-sm font-medium">{item.code} — {item.name}</p>
                    <p className="text-xs text-muted">Статья: {item.defaultExpenseArticle.code} — {item.defaultExpenseArticle.name}</p>
                  </button>
                );
              })}
            </div>
            {!loadingWorkspace && items.length === 0 ? <p className="text-sm text-muted">В этом разделе нет активных позиций.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Панель действия</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedItem ? (
              <>
                <p className="text-sm" data-testid="op-item-select">{selectedItem.code} — {selectedItem.name}</p>
                <Input label="Количество" value={draft.qtyInput} onChange={(event) => setDraft((prev) => ({ ...prev, qtyInput: event.target.value }))} data-testid="op-qty" />
                <Select label="Единица" value={draft.unitId} onChange={(event) => setDraft((prev) => ({ ...prev, unitId: event.target.value }))} data-testid="op-unit">{units.map((unit) => <option key={unit.id} value={unit.unitId}>{unit.unit.name}</option>)}</Select>
                <Select label="Статья расходов" value={draft.expenseArticleId} onChange={(event) => setDraft((prev) => ({ ...prev, expenseArticleId: event.target.value }))}>{articles.map((article) => <option key={article.id} value={article.id}>{article.code} — {article.name}</option>)}</Select>
                <Select label="Назначение" value={draft.purposeId} onChange={(event) => setDraft((prev) => ({ ...prev, purposeId: event.target.value }))}>{purposes.map((purpose) => <option key={purpose.id} value={purpose.id}>{purpose.code} — {purpose.name}</option>)}</Select>
                <Input label="Комментарий" value={draft.comment} onChange={(event) => setDraft((prev) => ({ ...prev, comment: event.target.value }))} />
                <Button variant="secondary" onClick={addLine} data-testid="op-add-line">Добавить в список</Button>
              </>
            ) : <p className="text-sm text-muted">Выберите позицию в рабочем поле, чтобы добавить строку движения.</p>}
            {type === 'IN' && intakeMode === 'DISTRIBUTE_PURPOSES' && lines.length > 0 ? <Button variant="ghost" onClick={() => setDistributeLine(lines[lines.length - 1])}>Распределить по назначениям</Button> : null}
          </CardContent>
        </Card>
      </div>

      {error ? <p className="text-sm text-critical">{error}</p> : null}
      {lines.length > 0 ? <BatchLinesList lines={lines} onDelete={(lineId) => setLines((prev) => prev.filter((line) => line.localId !== lineId))} onEdit={setEditLine} /> : null}
      <Button onClick={save} disabled={lines.length === 0} data-testid="op-save">Провести движение</Button>
      {warnings.length > 0 ? <div className="rounded border border-warn p-3 text-sm">Внимание: списание увело остаток в минус<ul className="list-inside list-disc">{warnings.map((w) => <li key={w.itemName}>{w.itemName}</li>)}</ul></div> : null}

      {result ? <ResultView transaction={result.transaction} lines={result.lines} onCancelTx={() => setCancelOpen(true)} onCancelLine={(lineId) => { setCancelLineId(lineId); setCancelOpen(true); }} onCorrectLine={(line) => { void openCorrectModal(line); }} /> : null}
      {toast ? <Toast message={toast} onClose={() => setToast('')} /> : null}

      <CancelModal open={cancelOpen} reasons={reasons} requireReason={policies.requireReasonOnCancel} onClose={() => { setCancelOpen(false); setCancelLineId(''); }} onSubmit={(payload) => { void submitCancel(payload); }} />
      <LineEditorModal open={Boolean(editLine)} mode="draft" units={units} articles={articles} purposes={purposes} initial={editLine ? { qtyInput: editLine.qtyInput, unitId: editLine.unitId, expenseArticleId: editLine.expenseArticleId, purposeId: editLine.purposeId, comment: editLine.comment } : {}} onClose={() => setEditLine(null)} onSubmit={(payload) => { if (!editLine) return; setLines((prev) => prev.map((line) => line.localId === editLine.localId ? { ...line, ...payload } as BatchLineDraft : line)); setEditLine(null); }} />
      <LineEditorModal open={Boolean(correctLineItem)} mode="correct" units={correctUnits} articles={articles} purposes={purposes} reasons={reasons} requireReason={policies.requireReasonOnCancel} initial={correctLineItem ? { qtyInput: String(correctLineItem.qtyInput), unitId: correctLineItem.unit.id, expenseArticleId: correctLineItem.expenseArticle.id, purposeId: correctLineItem.purpose.id, comment: correctLineItem.comment ?? '' } : {}} onClose={() => setCorrectLineItem(null)} onSubmit={(payload) => { void submitCorrection(payload); }} />
      <DistributePurposesModal open={Boolean(distributeLine)} totalQty={distributeLine?.qtyInput ?? ''} purposes={purposes} initial={distributeLine?.distributions ?? []} onClose={() => setDistributeLine(null)} onSave={(rows) => {
        if (!distributeLine) return;
        setLines((prev) => prev.map((line) => line.localId === distributeLine.localId ? { ...line, distributions: rows } : line));
        setDistributeLine(null);
      }} />
    </section>
  );
}
