'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { CatalogFilters } from '@/components/catalog/CatalogFilters';
import { ItemCards } from '@/components/catalog/ItemCards';
import { ItemFormModal } from '@/components/catalog/ItemFormModal';
import { ItemHeaderActions } from '@/components/catalog/ItemHeaderActions';
import { ItemsTable } from '@/components/catalog/ItemsTable';
import { CatalogItem, RefOption } from '@/components/catalog/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { Toast } from '@/components/ui/Toast';

export function CatalogPageClient({ categories, expenseArticles, purposes, units, canManage }: { categories: RefOption[]; expenseArticles: RefOption[]; purposes: RefOption[]; units: RefOption[]; canManage: boolean }): JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [filters, setFilters] = useState({ q: '', categoryId: '', expenseArticleId: '', purposeId: '', active: 'true' as 'true' | 'false' | 'all' });
  const [items, setItems] = useState<CatalogItem[]>([]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ ...filters, limit: '100', offset: '0' });
    const response = await fetch(`/api/items?${params.toString()}`, { cache: 'no-store' });
    const payload = (await response.json()) as { items: CatalogItem[] };
    if (response.ok) setItems(payload.items ?? []);
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(item: CatalogItem): Promise<void> {
    const response = await fetch(`/api/items/${item.id}/toggle-active`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !item.isActive }) });
    if (!response.ok) return;
    setToast(item.isActive ? 'Позиция в архиве' : 'Позиция восстановлена');
    await load();
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Номенклатура</h1>
        <p className="text-sm text-muted">Позиции, единицы учёта и привязки к статьям/назначениям.</p>
      </header>

      <CatalogFilters {...filters} categories={categories} expenseArticles={expenseArticles} purposes={purposes} onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))} />
      <ItemHeaderActions canManage={canManage} onOpenCreate={() => setOpen(true)} />

      {items.length === 0 ? <EmptyState title="Список пуст" description="Создайте первую позицию номенклатуры." /> : null}
      {items.length > 0 ? <ItemsTable items={items} canManage={canManage} onToggle={toggle} /> : null}
      {items.length > 0 ? <ItemCards items={items} canManage={canManage} onToggle={toggle} /> : null}

      <ItemFormModal open={open} categories={categories} expenseArticles={expenseArticles} purposes={purposes} units={units} onClose={() => setOpen(false)} onCreated={(id, note) => { setOpen(false); setToast(note ? `Позиция создана. ${note} Приход будет доступен в следующем модуле операций.` : 'Позиция создана'); router.push(`/catalog/${id}`); }} />
      {toast ? <Toast message={toast} onClose={() => setToast('')} /> : null}
    </section>
  );
}
