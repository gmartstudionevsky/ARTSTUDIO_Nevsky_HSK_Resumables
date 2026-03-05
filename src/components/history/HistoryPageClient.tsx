'use client';

import { useEffect, useMemo, useState } from 'react';

import { HistoryCards } from '@/components/history/HistoryCards';
import { HistoryFilters } from '@/components/history/HistoryFilters';
import { HistoryTable } from '@/components/history/HistoryTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { parseRuDateTime } from '@/lib/datetime/ru';
import { fetchHistoryList, fetchLookup, searchItems } from '@/lib/history/api';
import { HistoryListItem, RefOption } from '@/lib/history/types';

type FiltersState = {
  from: string;
  to: string;
  type: 'all' | 'IN' | 'OUT' | 'ADJUST' | 'OPENING' | 'INVENTORY_APPLY';
  status: 'all' | 'active' | 'cancelled';
  q: string;
  itemId: string;
  expenseArticleId: string;
  purposeId: string;
};

const limit = 30;

export function HistoryPageClient(): JSX.Element {
  const [filters, setFilters] = useState<FiltersState>({ from: '', to: '', type: 'all', status: 'all', q: '', itemId: '', expenseArticleId: '', purposeId: '' });
  const [debouncedQ, setDebouncedQ] = useState('');
  const [items, setItems] = useState<HistoryListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [itemOptions, setItemOptions] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [expenseArticles, setExpenseArticles] = useState<RefOption[]>([]);
  const [purposes, setPurposes] = useState<RefOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(timer);
  }, [filters.q]);

  useEffect(() => {
    void Promise.all([fetchLookup('expense-articles'), fetchLookup('purposes'), searchItems('')]).then(([articleRows, purposeRows, itemRows]) => {
      setExpenseArticles(articleRows);
      setPurposes(purposeRows);
      setItemOptions(itemRows);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const from = filters.from ? parseRuDateTime(filters.from) : null;
    const to = filters.to ? parseRuDateTime(filters.to) : null;
    void fetchHistoryList({
      from: from?.toISOString(),
      to: to?.toISOString(),
      type: filters.type,
      status: filters.status,
      q: debouncedQ,
      itemId: filters.itemId,
      expenseArticleId: filters.expenseArticleId,
      purposeId: filters.purposeId,
      limit,
      offset,
    }).then((payload) => {
      setItems(payload.items);
      setTotal(payload.total);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filters.type, filters.status, filters.itemId, filters.expenseArticleId, filters.purposeId, filters.from, filters.to, debouncedQ, offset]);

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
    setFilters((prev) => ({
      ...prev,
      from: `${String(start.getDate()).padStart(2, '0')}.${String(start.getMonth() + 1).padStart(2, '0')}.${start.getFullYear()} 00:00`,
      to: `${String(end.getDate()).padStart(2, '0')}.${String(end.getMonth() + 1).padStart(2, '0')}.${end.getFullYear()} 23:59`,
    }));
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
      />

      {loading ? <p className="text-sm text-muted">Загрузка операций...</p> : null}
      {!loading && items.length === 0 ? <EmptyState title="Операции не найдены" description="Измените фильтры или создайте операции в разделе «Операции»." /> : null}
      {!loading && items.length > 0 ? <><HistoryTable items={items} /><HistoryCards items={items} /></> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted">Показано {fromTo.from}–{fromTo.to} из {total}</p>
        <div className="flex gap-2">
          <button type="button" className="rounded-md border border-border px-3 py-2 disabled:opacity-50" disabled={offset === 0} onClick={() => setOffset((prev) => Math.max(prev - limit, 0))}>Назад</button>
          <button type="button" className="rounded-md border border-border px-3 py-2 disabled:opacity-50" disabled={offset + limit >= total} onClick={() => setOffset((prev) => prev + limit)}>Вперёд</button>
        </div>
      </div>
    </section>
  );
}
