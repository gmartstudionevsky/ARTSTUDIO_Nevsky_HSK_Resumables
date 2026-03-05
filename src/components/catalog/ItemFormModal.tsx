'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import { RefOption } from '@/components/catalog/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface Props {
  open: boolean;
  categories: RefOption[];
  expenseArticles: RefOption[];
  purposes: RefOption[];
  units: RefOption[];
  onClose: () => void;
  onCreated: (id: string, note: string) => void;
}

export function ItemFormModal({ open, categories, expenseArticles, purposes, units, onClose, onCreated }: Props): JSX.Element | null {
  const baseUnitId = units[0]?.id ?? '';
  const [form, setForm] = useState({ name: '', categoryId: categories[0]?.id ?? '', defaultExpenseArticleId: expenseArticles[0]?.id ?? '', defaultPurposeId: purposes[0]?.id ?? '', baseUnitId, defaultInputUnitId: baseUnitId, reportUnitId: baseUnitId, minQtyBase: '', synonyms: '', note: '' });
  const [openingEnabled, setOpeningEnabled] = useState(false);
  const [openingQty, setOpeningQty] = useState('');
  const [openingUnitId, setOpeningUnitId] = useState(baseUnitId);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm({ name: '', categoryId: categories[0]?.id ?? '', defaultExpenseArticleId: expenseArticles[0]?.id ?? '', defaultPurposeId: purposes[0]?.id ?? '', baseUnitId: units[0]?.id ?? '', defaultInputUnitId: units[0]?.id ?? '', reportUnitId: units[0]?.id ?? '', minQtyBase: '', synonyms: '', note: '' });
    setOpeningUnitId(units[0]?.id ?? '');
    setOpeningEnabled(false);
    setOpeningQty('');
    setError('');
  }, [open, categories, expenseArticles, purposes, units]);

  const openingNote = useMemo(() => (openingEnabled && openingQty ? `Приход в ожидании: ${openingQty} (${units.find((item) => item.id === openingUnitId)?.name ?? ''}).` : ''), [openingEnabled, openingQty, openingUnitId, units]);

  if (!open) return null;

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!form.name.trim() || !form.categoryId || !form.defaultExpenseArticleId || !form.defaultPurposeId || !form.baseUnitId || !form.defaultInputUnitId || !form.reportUnitId) {
      setError('Заполните обязательные поля');
      return;
    }

    setLoading(true);
    setError('');
    const response = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        minQtyBase: form.minQtyBase ? Number(form.minQtyBase) : undefined,
      }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string; item?: { id: string } } | null;
    setLoading(false);

    if (!response.ok || !payload?.item) {
      setError(payload?.error ?? 'Не удалось создать позицию');
      return;
    }

    onCreated(payload.item.id, openingNote);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="max-h-[90vh] w-full max-w-3xl space-y-4 overflow-auto rounded-lg border border-border bg-bg p-5">
        <h2 className="text-xl font-semibold">Новая позиция</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Input label="Название" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <Select label="Раздел" value={form.categoryId} onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
          <Select label="Статья расходов" value={form.defaultExpenseArticleId} onChange={(e) => setForm((p) => ({ ...p, defaultExpenseArticleId: e.target.value }))}>{expenseArticles.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select>
          <Select label="Назначение" value={form.defaultPurposeId} onChange={(e) => setForm((p) => ({ ...p, defaultPurposeId: e.target.value }))}>{purposes.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select>
          <Select label="Базовая единица" value={form.baseUnitId} onChange={(e) => setForm((p) => ({ ...p, baseUnitId: e.target.value, defaultInputUnitId: e.target.value, reportUnitId: e.target.value }))}>{units.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
          <Select label="Ед. отчётности" value={form.reportUnitId} onChange={(e) => setForm((p) => ({ ...p, reportUnitId: e.target.value }))}>{units.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
          <Select label="Ед. ввода" value={form.defaultInputUnitId} onChange={(e) => setForm((p) => ({ ...p, defaultInputUnitId: e.target.value }))}>{units.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
          <Input label="Мин. остаток" type="number" value={form.minQtyBase} onChange={(e) => setForm((p) => ({ ...p, minQtyBase: e.target.value }))} />
          <Input label="Синонимы" value={form.synonyms} onChange={(e) => setForm((p) => ({ ...p, synonyms: e.target.value }))} />
          <Input label="Примечание" value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} />
        </div>
        <div className="space-y-2 rounded-md border border-border p-3 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={openingEnabled} onChange={(e) => setOpeningEnabled(e.target.checked)} />Товар уже на складе</label>
          {openingEnabled ? <div className="grid gap-3 md:grid-cols-2"><Input label="Количество" type="number" value={openingQty} onChange={(e) => setOpeningQty(e.target.value)} /><Select label="Единица" value={openingUnitId} onChange={(e) => setOpeningUnitId(e.target.value)}>{units.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></div> : null}
          <p className="text-muted">После создания мы сформируем приход на это количество.</p>
        </div>
        {error ? <p className="text-sm text-critical">{error}</p> : null}
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Отмена</Button><Button type="submit" loading={loading}>Создать</Button></div>
      </form>
    </div>
  );
}
