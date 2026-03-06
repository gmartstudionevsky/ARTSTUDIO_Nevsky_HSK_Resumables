'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { HistoryCards } from '@/components/history/HistoryCards';
import { HistoryFilters } from '@/components/history/HistoryFilters';
import { HistoryTable } from '@/components/history/HistoryTable';
import { QuickFixDrawer } from '@/components/history/QuickFixDrawer';
import { CancelModal } from '@/components/operation/CancelModal';
import { SaveFilterModal } from '@/components/saved-filters/SaveFilterModal';
import { SavedFiltersDropdown } from '@/components/saved-filters/SavedFiltersDropdown';
import { EmptyState } from '@/components/ui/EmptyState';
import { parseRuDateTime } from '@/lib/datetime/ru';
import { fetchCategoriesLookup, fetchHistoryList, fetchLookup, fetchUsersLookup, searchItems } from '@/lib/history/api';
import { HistoryListItem, RefOption } from '@/lib/history/types';
import { fetchPolicies } from '@/lib/operation/api';
import { createSavedFilter, deleteSavedFilter, fetchSavedFilters, serializeHistoryFilters, updateSavedFilter } from '@/lib/saved-filters/api';
import { SavedFilterItem } from '@/lib/saved-filters/types';

type FiltersState = {
  from: string;
  to: string;
  type: 'all' | 'IN' | 'OUT' | 'ADJUST' | 'OPENING' | 'INVENTORY_APPLY';
  status: 'all' | 'active' | 'cancelled';
  q: string;
  itemId: string;
  expenseArticleId: string;
  purposeId: string;
  createdById: string;
  categoryId: string;
};

const limit = 30;

const initialFilters: FiltersState = { from: '', to: '', type: 'all', status: 'all', q: '', itemId: '', expenseArticleId: '', purposeId: '', createdById: '', categoryId: '' };

async function postJson(url: string, payload: unknown): Promise<void> {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error('Ошибка');
}

export function HistoryPageClient(): JSX.Element {
  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [debouncedQ, setDebouncedQ] = useState('');
  const [items, setItems] = useState<HistoryListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [itemOptions, setItemOptions] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [expenseArticles, setExpenseArticles] = useState<RefOption[]>([]);
  const [purposes, setPurposes] = useState<RefOption[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; login: string }>>([]);
  const [reasons, setReasons] = useState<RefOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<SavedFilterItem[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);
  const [defaultApplied, setDefaultApplied] = useState(false);
  const [cancelTxId, setCancelTxId] = useState<string | null>(null);
  const [quickFixId, setQuickFixId] = useState<string | null>(null);
  const [requireReason, setRequireReason] = useState(true);

  const reloadList = useCallback((): void => {
    setLoading(true);
    const from = filters.from ? parseRuDateTime(filters.from) : null;
    const to = filters.to ? parseRuDateTime(filters.to) : null;
    void fetchHistoryList({ from: from?.toISOString(), to: to?.toISOString(), type: filters.type, status: filters.status, q: debouncedQ, itemId: filters.itemId, expenseArticleId: filters.expenseArticleId, purposeId: filters.purposeId, createdById: filters.createdById, categoryId: filters.categoryId, limit, offset }).then((payload) => {
      setItems(payload.items);
      setTotal(payload.total);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filters.from, filters.to, filters.type, filters.status, filters.itemId, filters.expenseArticleId, filters.purposeId, filters.createdById, filters.categoryId, debouncedQ, offset]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(timer);
  }, [filters.q]);

  useEffect(() => {
    void Promise.all([
      fetchLookup('expense-articles'),
      fetchLookup('purposes'),
      fetchCategoriesLookup(),
      fetchLookup('reasons'),
      searchItems(''),
      fetchUsersLookup(),
      fetchSavedFilters('HISTORY'),
      fetchPolicies(),
    ]).then(([articleRows, purposeRows, categoryRows, reasonRows, itemRows, userRows, savedRows, policies]) => {
      setExpenseArticles(articleRows);
      setPurposes(purposeRows);
      setCategories(categoryRows);
      setReasons(reasonRows);
      setItemOptions(itemRows);
      setUsers(userRows.map((item) => ({ id: item.id, login: item.login })));
      setSaved(savedRows.items);
      setRequireReason(policies.requireReasonOnCancel);
    });
  }, []);

  useEffect(() => {
    if (defaultApplied) return;
    const defaultFilter = saved.find((item) => item.isDefault);
    if (!defaultFilter) {
      setDefaultApplied(true);
      return;
    }
    const payload = defaultFilter.payload as Partial<FiltersState>;
    setFilters((prev) => ({ ...prev, ...Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, String(v)])) }));
    setSelectedSavedId(defaultFilter.id);
    setDefaultApplied(true);
  }, [saved, defaultApplied]);

  useEffect(() => {
    reloadList();
  }, [reloadList]);

  const fromTo = useMemo(() => {
    const from = total === 0 ? 0 : offset + 1;
    const to = Math.min(offset + limit, total);
    return { from, to };
  }, [offset, total]);

  function applyPreset(days: number): void {
    const end = new Date();
    const start = new Date();
    if (days > 0) start.setDate(end.getDate() - days);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 0, 0);
    setOffset(0);
    setFilters((prev) => ({ ...prev, from: `${String(start.getDate()).padStart(2, '0')}.${String(start.getMonth() + 1).padStart(2, '0')}.${start.getFullYear()} 00:00`, to: `${String(end.getDate()).padStart(2, '0')}.${String(end.getMonth() + 1).padStart(2, '0')}.${end.getFullYear()} 23:59` }));
  }

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">История</h1>
        <p className="text-sm text-muted">Все операции сохраняются. Отмена и исправление не удаляют данные.</p>
      </header>

      <HistoryFilters
        value={filters}
        onChange={(patch) => { setOffset(0); setFilters((prev) => ({ ...prev, ...patch })); }}
        onPreset={applyPreset}
        items={itemOptions}
        expenseArticles={expenseArticles}
        purposes={purposes}
        users={users}
        categories={categories}
        savedActions={<div className="flex flex-wrap items-end gap-2"><button data-testid="history-save-filter" type="button" className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => setSaveOpen(true)}>Сохранить</button><SavedFiltersDropdown items={saved} value={selectedSavedId} testId="history-saved-dropdown" onChange={setSelectedSavedId} onApply={() => {
          const selected = saved.find((item) => item.id === selectedSavedId);
          if (!selected) return;
          const payload = selected.payload as Partial<FiltersState>;
          setOffset(0);
          setFilters((prev) => ({ ...prev, ...Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, String(v)])) }));
        }} onRename={() => {
          const selected = saved.find((item) => item.id === selectedSavedId);
          if (!selected) return;
          const name = window.prompt('Новое имя фильтра', selected.name);
          if (!name) return;
          void updateSavedFilter(selected.id, { name }).then(async () => { const payload = await fetchSavedFilters('HISTORY'); setSaved(payload.items); });
        }} onDelete={() => {
          if (!selectedSavedId) return;
          void deleteSavedFilter(selectedSavedId).then(async () => { const payload = await fetchSavedFilters('HISTORY'); setSaved(payload.items); setSelectedSavedId(''); });
        }} onMakeDefault={() => {
          if (!selectedSavedId) return;
          void updateSavedFilter(selectedSavedId, { isDefault: true }).then(async () => { const payload = await fetchSavedFilters('HISTORY'); setSaved(payload.items); });
        }} /></div>}
      />

      {loading ? <p className="text-sm text-muted">Загрузка операций...</p> : null}
      {!loading && items.length === 0 ? <EmptyState title="Операции не найдены" description="Измените фильтры или создайте операции в разделе «Операции»." /> : null}
      {!loading && items.length > 0 ? <><HistoryTable items={items} onCancel={(item) => setCancelTxId(item.id)} onFix={(item) => setQuickFixId(item.id)} /><HistoryCards items={items} onCancel={(item) => setCancelTxId(item.id)} onFix={(item) => setQuickFixId(item.id)} /></> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted">Показано {fromTo.from}–{fromTo.to} из {total}</p>
        <div className="flex gap-2">
          <button type="button" className="rounded-md border border-border px-3 py-2 disabled:opacity-50" disabled={offset === 0} onClick={() => setOffset((prev) => Math.max(prev - limit, 0))}>Назад</button>
          <button type="button" className="rounded-md border border-border px-3 py-2 disabled:opacity-50" disabled={offset + limit >= total} onClick={() => setOffset((prev) => prev + limit)}>Вперёд</button>
        </div>
      </div>

      <SaveFilterModal open={saveOpen} onClose={() => setSaveOpen(false)} onSubmit={(payload) => {
        void createSavedFilter({ kind: 'HISTORY', name: payload.name, isDefault: payload.isDefault, payload: serializeHistoryFilters(filters as unknown as Record<string, string>) }).then(async () => {
          setSaveOpen(false);
          const rows = await fetchSavedFilters('HISTORY');
          setSaved(rows.items);
        });
      }} />

      <CancelModal open={Boolean(cancelTxId)} reasons={reasons.map((item) => ({ ...item, isActive: true }))} requireReason={requireReason} onClose={() => setCancelTxId(null)} onSubmit={(payload) => {
        if (!cancelTxId) return;
        void postJson(`/api/transactions/${cancelTxId}/cancel`, payload).then(() => {
          setCancelTxId(null);
          reloadList();
        });
      }} />

      <QuickFixDrawer id={quickFixId} open={Boolean(quickFixId)} onClose={() => setQuickFixId(null)} onChanged={reloadList} />
    </section>
  );
}
