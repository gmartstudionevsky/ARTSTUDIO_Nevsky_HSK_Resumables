'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { LookupItem, UnitOption } from '@/lib/operation/types';

export function LineEditorModal({ open, mode, units, articles, purposes, reasons, initial, onClose, onSubmit }: { open: boolean; mode: 'draft' | 'correct'; units: UnitOption[]; articles: LookupItem[]; purposes: LookupItem[]; reasons?: LookupItem[]; initial: Record<string, string>; onClose: () => void; onSubmit: (payload: Record<string, string>) => void }): JSX.Element | null {
  const [form, setForm] = useState(initial);

  useEffect(() => setForm(initial), [initial]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl space-y-3 rounded-lg border border-border bg-bg p-4">
        <h3 className="text-lg font-semibold">{mode === 'correct' ? 'Исправить строку' : 'Редактировать строку'}</h3>
        <Input label="Количество" value={form.qtyInput ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, qtyInput: event.target.value }))} />
        <Select label="Единица" value={form.unitId ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, unitId: event.target.value }))}>{units.map((unit) => <option key={unit.id} value={unit.unitId}>{unit.unit.name}</option>)}</Select>
        <Select label="Статья" value={form.expenseArticleId ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, expenseArticleId: event.target.value }))}>{articles.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select>
        <Select label="Назначение" value={form.purposeId ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, purposeId: event.target.value }))}>{purposes.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select>
        <Input label="Комментарий" value={form.comment ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, comment: event.target.value }))} />
        {mode === 'correct' ? (
          <>
            <Select label="Причина" value={form.reasonId ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, reasonId: event.target.value }))}>
              <option value="">Без причины</option>
              {(reasons ?? []).map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
            </Select>
            <Input label="Примечание к отмене" value={form.cancelNote ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, cancelNote: event.target.value }))} />
          </>
        ) : null}
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Отмена</Button><Button onClick={() => onSubmit(form)}>Сохранить</Button></div>
      </div>
    </div>
  );
}
