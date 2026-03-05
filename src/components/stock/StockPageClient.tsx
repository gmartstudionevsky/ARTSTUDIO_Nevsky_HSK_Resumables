'use client';

import { useEffect, useState } from 'react';

import { StockCards } from '@/components/stock/StockCards';
import { StockFilters } from '@/components/stock/StockFilters';
import { EmptyState } from '@/components/ui/EmptyState';
import { fetchPolicies } from '@/lib/operation/api';
import { fetchStockList } from '@/lib/stock/api';
import { StockTable } from '@/components/stock/StockTable';
import { ActiveFilter, StockListItem, StockStatusFilter } from '@/lib/stock/types';

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

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(timer);
  }, [filters.q]);

  useEffect(() => {
    void Promise.all([
      fetchLookup('/api/lookup/categories?active=all'),
      fetchLookup('/api/lookup/expense-articles?active=all'),
      fetchLookup('/api/lookup/purposes?active=all'),
    ]).then(([categoryItems, articleItems, purposeItems]) => {
      setCategories(categoryItems);
      setExpenseArticles(articleItems);
      setPurposes(purposeItems);
    });
    void fetchPolicies().then((p) => setDecimals(p.displayDecimals)).catch(() => null);
  }, []);

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
      <StockFilters value={filters} categories={categories} expenseArticles={expenseArticles} purposes={purposes} onChange={setFilters} />
      {loading ? <p className="text-sm text-muted">Загрузка данных...</p> : <p className="text-sm text-muted">Найдено позиций: {total}</p>}
      {!loading && items.length === 0 ? <EmptyState title="Позиции не найдены" description="Измените фильтры или добавьте операции по позициям." /> : null}
      {!loading && items.length > 0 ? <><StockTable items={items} decimals={decimals} /><StockCards items={items} decimals={decimals} /></> : null}
    </section>
  );
}
