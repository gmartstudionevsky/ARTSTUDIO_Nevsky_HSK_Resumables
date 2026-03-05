'use client';

import { useCallback, useEffect, useState } from 'react';

import { UiTextModal } from '@/components/admin/ui-texts/UiTextModal';
import { UiTextsCards } from '@/components/admin/ui-texts/UiTextsCards';
import { UiTextsTable } from '@/components/admin/ui-texts/UiTextsTable';
import { useUiTextsContext } from '@/components/ui-texts/UiTextProvider';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';
import { fetchAdminUiTexts } from '@/lib/ui-texts/api';
import { UiTextItem, UiTextScope } from '@/lib/ui-texts/types';

export default function AdminUiTextsPage(): JSX.Element {
  const { refresh } = useUiTextsContext();
  const [items, setItems] = useState<UiTextItem[]>([]);
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<'all' | UiTextScope>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<UiTextItem | null>(null);

  const loadData = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');

    try {
      const response = await fetchAdminUiTexts({ q, scope, limit: 50, offset: 0 });
      setItems(response.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Ошибка загрузки');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q, scope]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadData();
    }, 250);

    return () => clearTimeout(timeout);
  }, [loadData]);

  async function handleSave(data: { key?: string; ruText: string; scope: UiTextScope }): Promise<string | null> {
    const isEdit = Boolean(editItem);
    const url = isEdit ? `/api/admin/ui-texts/${editItem?.id}` : '/api/admin/ui-texts';
    const method = isEdit ? 'PATCH' : 'POST';
    const payload = isEdit ? { ruText: data.ruText, scope: data.scope } : data;

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) return json?.error ?? 'Ошибка сохранения';

    setToastMessage('Сохранено');
    setModalOpen(false);
    setEditItem(null);
    await Promise.all([loadData(), refresh()]);
    return null;
  }

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-text">Тексты интерфейса</h1>
        <p className="text-sm text-muted">Настраивайте подписи меню и подсказки без разработки.</p>
      </header>

      <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-end">
        <Input label="Поиск" placeholder="Ключ или текст" value={q} onChange={(event) => setQ(event.target.value)} />
        <Select label="Scope" value={scope} onChange={(event) => setScope(event.target.value as 'all' | UiTextScope)}>
          <option value="all">Все</option>
          <option value="BOTH">BOTH</option>
          <option value="WEB">WEB</option>
          <option value="MOBILE">MOBILE</option>
        </Select>
        <Button onClick={() => { setEditItem(null); setModalOpen(true); }}>Добавить текст</Button>
      </div>

      {loading ? <p className="text-sm text-muted">Загрузка...</p> : null}
      {error ? <p className="text-sm text-critical">{error}</p> : null}
      {!loading && items.length === 0 ? <EmptyState title="Список пуст" description="Добавьте UI-текст для управления подписями." /> : null}
      {!loading && items.length > 0 ? (
        <>
          <UiTextsTable items={items} onEdit={(item) => { setEditItem(item); setModalOpen(true); }} />
          <UiTextsCards items={items} onEdit={(item) => { setEditItem(item); setModalOpen(true); }} />
        </>
      ) : null}

      <UiTextModal open={modalOpen} item={editItem} onClose={() => { setModalOpen(false); setEditItem(null); }} onSave={handleSave} />
      {toastMessage ? <Toast message={toastMessage} onClose={() => setToastMessage('')} /> : null}
    </main>
  );
}
