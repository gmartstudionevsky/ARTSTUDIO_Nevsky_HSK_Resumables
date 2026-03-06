'use client';

import { useEffect, useState } from 'react';

import { StockCards } from '@/components/stock/StockCards';
import { StockFilters } from '@/components/stock/StockFilters';
import { EmptyState } from '@/components/ui/EmptyState';
import { fetchPolicies } from '@/lib/operation/api';
import { fetchStockList } from '@/lib/stock/api';
import { StockTable } from '@/components/stock/StockTable';
import { ActiveFilter, StockListItem, StockStatusFilter } from '@/lib/stock/types';
import { SaveFilterModal } from '@/components/saved-filters/SaveFilterModal';
import { SavedFiltersDropdown } from '@/components/saved-filters/SavedFiltersDropdown';
import { createSavedFilter, deleteSavedFilter, fetchSavedFilters, serializeStockFilters, updateSavedFilter } from '@/lib/saved-filters/api';
import { SavedFilterItem } from '@/lib/saved-filters/types';

type RefOption = { id: string; name: string; code?: string };

type FilterState = {
  q: string;
  categoryId: string;
  expenseArticleId: string;
  purposeId: string;
  status: StockStatusFilter;
  active: ActiveFilter;
};

const initialFilters: FilterState = {
  q: '',
  categoryId: '',
  expenseArticleId: '',
  purposeId: '',
  status: 'all',
  active: 'true',
};

async function fetchLookup(path: string): Promise<RefOption[]> {
  const response = await fetch(path, { cache: 'no-store' });
  const payload = (await response.json()) as { items: RefOption[] };
  return payload.items;
}

export function StockPageClient(): JSX.Element {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [debouncedQ, setDebouncedQ] = useState(filters.q);
  const [items, setItems] = useState<StockListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<RefOption[]>([]);
  const [expenseArticles, setExpenseArticles] = useState<RefOption[]>([]);
  const [purposes, setPurposes] = useState<RefOption[]>([]);
  const [decimals, setDecimals] = useState(2);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<SavedFilterItem[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);
  const [defaultApplied, setDefaultApplied] = useState(false);
  const [savedLoaded, setSavedLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(timer);
  }, [filters.q]);

  useEffect(() => {
    void Promise.all([
      fetchLookup('/api/lookup/categories?active=all'),
      fetchLookup('/api/lookup/expense-articles?active=all'),
      fetchLookup('/api/lookup/purposes?active=all'),
      fetchSavedFilters('STOCK'),
    ]).then(([categoryItems, articleItems, purposeItems, savedRows]) => {
      setCategories(categoryItems);
      setExpenseArticles(articleItems);
      setPurposes(purposeItems);
      setSaved(savedRows.items);
      setSavedLoaded(true);
    });
    void fetchPolicies().then((p) => setDecimals(p.displayDecimals)).catch(() => null);
  }, []);

  useEffect(() => {
    if (!savedLoaded || defaultApplied) return;
    const defaultFilter = saved.find((item) => item.isDefault);
    if (!defaultFilter) {
      setDefaultApplied(true);
      return;
    }
    setFilters((prev) => ({ ...prev, ...Object.fromEntries(Object.entries(defaultFilter.payload).map(([k, v]) => [k, String(v)])) }));
    setSelectedSavedId(defaultFilter.id);
    setDefaultApplied(true);
  }, [saved, savedLoaded, defaultApplied]);

  useEffect(() => {
    setLoading(true);
    void fetchStockList({
      q: debouncedQ || undefined,
      categoryId: filters.categoryId || undefined,
      expenseArticleId: filters.expenseArticleId || undefined,
      purposeId: filters.purposeId || undefined,
      status: filters.status,
      active: filters.active,
      limit: 100,
      offset: 0,
    }).then((payload) => {
      setItems(payload.items);
      setTotal(payload.total);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [debouncedQ, filters.categoryId, filters.expenseArticleId, filters.purposeId, filters.status, filters.active]);

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Склад</h1>
        <p className="text-sm text-muted">Актуальные остатки считаются автоматически по операциям.</p>
      </header>
      <StockFilters value={filters} categories={categories} expenseArticles={expenseArticles} purposes={purposes} onChange={setFilters} savedActions={<div className="flex flex-wrap items-end gap-2"><button data-testid="stock-save-filter" type="button" className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => setSaveOpen(true)}>Сохранить</button><SavedFiltersDropdown items={saved} value={selectedSavedId} testId="stock-saved-dropdown" onChange={setSelectedSavedId} onApply={() => {
        const selected = saved.find((item) => item.id === selectedSavedId);
        if (!selected) return;
        setFilters((prev) => ({ ...prev, ...Object.fromEntries(Object.entries(selected.payload).map(([k, v]) => [k, String(v)])) }));
      }} onRename={() => {
        const selected = saved.find((item) => item.id === selectedSavedId);
        if (!selected) return;
        const name = window.prompt('Новое имя фильтра', selected.name);
        if (!name) return;
        void updateSavedFilter(selected.id, { name }).then(async () => { const rows = await fetchSavedFilters('STOCK'); setSaved(rows.items); });
      }} onDelete={() => {
        if (!selectedSavedId) return;
        void deleteSavedFilter(selectedSavedId).then(async () => { const rows = await fetchSavedFilters('STOCK'); setSaved(rows.items); setSelectedSavedId(''); });
      }} onMakeDefault={() => {
        if (!selectedSavedId) return;
        void updateSavedFilter(selectedSavedId, { isDefault: true }).then(async () => { const rows = await fetchSavedFilters('STOCK'); setSaved(rows.items); });
      }} /></div>} />
      {loading ? <p className="text-sm text-muted">Загрузка данных...</p> : <p className="text-sm text-muted">Найдено позиций: {total}</p>}
      {!loading && items.length === 0 ? <EmptyState title="Позиции не найдены" description="Измените фильтры или добавьте операции по позициям." /> : null}
      {!loading && items.length > 0 ? <><StockTable items={items} decimals={decimals} /><StockCards items={items} decimals={decimals} /></> : null}

      <SaveFilterModal open={saveOpen} onClose={() => setSaveOpen(false)} onSubmit={(payload) => {
        void createSavedFilter({ kind: 'STOCK', name: payload.name, isDefault: payload.isDefault, payload: serializeStockFilters(filters as unknown as Record<string, string>) }).then(async () => {
          setSaveOpen(false);
          const rows = await fetchSavedFilters('STOCK');
          setSaved(rows.items);
        });
      }} />
    </section>
  );
}
