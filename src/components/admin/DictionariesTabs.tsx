'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { DictionaryCards } from '@/components/admin/DictionaryCards';
import { DictionaryFormModal } from '@/components/admin/DictionaryFormModal';
import { DictionaryTable } from '@/components/admin/DictionaryTable';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { Toast } from '@/components/ui/Toast';
import { HelpTip } from '@/components/ui/Tooltip';

export type DictionaryType = 'categories' | 'units' | 'expense-articles' | 'purposes' | 'reasons';
export type DictionaryItem = { id: string; isActive: boolean; name: string; sortOrder?: number; code?: string };

const tabConfig: { type: DictionaryType; label: string; addLabel: string; single: string }[] = [
  { type: 'categories', label: 'Разделы', addLabel: 'Добавить раздел', single: 'раздел' },
  { type: 'units', label: 'Единицы', addLabel: 'Добавить единицу', single: 'единицу' },
  { type: 'expense-articles', label: 'Статьи расходов', addLabel: 'Добавить статью расходов', single: 'статью расходов' },
  { type: 'purposes', label: 'Назначения', addLabel: 'Добавить назначение', single: 'назначение' },
  { type: 'reasons', label: 'Причины', addLabel: 'Добавить причину', single: 'причину' },
];

export function DictionariesTabs(): JSX.Element {
  const [type, setType] = useState<DictionaryType>('categories');
  const [q, setQ] = useState('');
  const [active, setActive] = useState<'true' | 'false' | 'all'>('true');
  const [items, setItems] = useState<DictionaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<DictionaryItem | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  const currentTab = useMemo(() => tabConfig.find((tab) => tab.type === type) ?? tabConfig[0], [type]);

  const loadData = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ q, active, limit: '50', offset: '0' });
    const response = await fetch(`/api/admin/dictionaries/${type}?${params.toString()}`, { cache: 'no-store' });
    const payload = (await response.json().catch(() => null)) as { items?: DictionaryItem[]; error?: string } | null;

    if (!response.ok) {
      setError(payload?.error ?? 'Ошибка загрузки');
      setItems([]);
      setLoading(false);
      return;
    }

    setItems(payload?.items ?? []);
    setLoading(false);
  }, [active, q, type]);


  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadData();
    }, 250);

    return () => clearTimeout(timeout);
  }, [loadData]);
  async function handleSave(data: Record<string, unknown>): Promise<string | null> {
    const isEdit = Boolean(editItem);
    const url = isEdit ? `/api/admin/dictionaries/${type}/${editItem?.id}` : `/api/admin/dictionaries/${type}`;
    const method = isEdit ? 'PATCH' : 'POST';
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      return payload?.error ?? 'Ошибка сохранения';
    }

    setToastMessage('Сохранено');
    setModalOpen(false);
    setEditItem(null);
    await loadData();
    return null;
  }

  async function handleToggle(item: DictionaryItem): Promise<void> {
    const response = await fetch(`/api/admin/dictionaries/${type}/${item.id}/toggle-active`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !item.isActive }),
    });

    if (!response.ok) {
      setToastMessage('Не удалось изменить статус');
      return;
    }

    setToastMessage(item.isActive ? 'Перемещено в архив' : 'Возвращено');
    await loadData();
  }

  return (
    <section className="space-y-4">
      <Tabs
        value={type}
        items={tabConfig.map((tab) => ({ value: tab.type, label: tab.label }))}
        onChange={(value) => {
          setType(value);
        }}
      />

      <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-end">
        <Input label="Поиск" placeholder="Введите код или название" value={q} onChange={(event) => setQ(event.target.value)} />
        <Select label="Статус" value={active} onChange={(event) => setActive(event.target.value as 'true' | 'false' | 'all')}>
          <option value="true">Активные</option>
          <option value="false">Архив</option>
          <option value="all">Все</option>
        </Select>
        <Button onClick={() => { setEditItem(null); setModalOpen(true); }} className="md:mb-[1px]">{currentTab.addLabel}</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        Архив
        <HelpTip label="Что такое архив">Архивные записи не удаляются и могут быть возвращены обратно.</HelpTip>
        Код
        <HelpTip label="Зачем код">Код используют для быстрой идентификации в документах и отчётах.</HelpTip>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => void loadData()}>Обновить</Button>
      </div>

      {loading ? <p className="text-sm text-muted">Загрузка...</p> : null}
      {error ? <p className="text-sm text-critical">{error}</p> : null}
      {!loading && items.length === 0 ? <EmptyState title="Список пуст" description="Добавьте запись, чтобы начать работу со справочником." /> : null}
      {!loading && items.length > 0 ? (
        <>
          <DictionaryTable type={type} items={items} onEdit={(item) => { setEditItem(item); setModalOpen(true); }} onToggle={handleToggle} />
          <DictionaryCards type={type} items={items} onEdit={(item) => { setEditItem(item); setModalOpen(true); }} onToggle={handleToggle} />
        </>
      ) : null}

      <DictionaryFormModal open={modalOpen} type={type} item={editItem} title={editItem ? `Редактировать ${currentTab.single}` : `Добавить ${currentTab.single}`} onClose={() => { setModalOpen(false); setEditItem(null); }} onSave={handleSave} />
      {toastMessage ? <Toast message={toastMessage} onClose={() => setToastMessage('')} /> : null}
    </section>
  );
}
