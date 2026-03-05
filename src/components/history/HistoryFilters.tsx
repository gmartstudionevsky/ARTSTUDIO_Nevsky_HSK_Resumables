'use client';

import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { RefOption } from '@/lib/history/types';

interface HistoryFiltersState {
  from: string;
  to: string;
  type: 'all' | 'IN' | 'OUT' | 'ADJUST' | 'OPENING' | 'INVENTORY_APPLY';
  status: 'all' | 'active' | 'cancelled';
  q: string;
  itemId: string;
  expenseArticleId: string;
  purposeId: string;
}

export function HistoryFilters({ value, onChange, onPreset, items, expenseArticles, purposes }: { value: HistoryFiltersState; onChange: (patch: Partial<HistoryFiltersState>) => void; onPreset: (days: number) => void; items: Array<{ id: string; code: string; name: string }>; expenseArticles: RefOption[]; purposes: RefOption[] }): JSX.Element {
  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="grid gap-3 md:grid-cols-5">
        <Input type="datetime-local" label="С" value={value.from} onChange={(event) => onChange({ from: event.target.value })} />
        <Input type="datetime-local" label="По" value={value.to} onChange={(event) => onChange({ to: event.target.value })} />
        <Select label="Тип" value={value.type} onChange={(event) => onChange({ type: event.target.value as HistoryFiltersState['type'] })}>
          <option value="all">Все</option>
          <option value="IN">Приход</option>
          <option value="OUT">Расход</option>
          <option value="ADJUST">Коррекция</option>
          <option value="OPENING">Открытие</option>
          <option value="INVENTORY_APPLY">Инвентаризация</option>
        </Select>
        <Select label="Статус" value={value.status} onChange={(event) => onChange({ status: event.target.value as HistoryFiltersState['status'] })}>
          <option value="all">Все</option>
          <option value="active">Активные</option>
          <option value="cancelled">Отменённые</option>
        </Select>
        <Input label="Поиск" placeholder="batch, позиция, пользователь..." value={value.q} onChange={(event) => onChange({ q: event.target.value })} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-md border border-border px-3 py-1 text-sm" onClick={() => onPreset(0)}>Сегодня</button>
        <button type="button" className="rounded-md border border-border px-3 py-1 text-sm" onClick={() => onPreset(7)}>7 дней</button>
        <button type="button" className="rounded-md border border-border px-3 py-1 text-sm" onClick={() => onPreset(30)}>30 дней</button>
      </div>
      <details>
        <summary className="cursor-pointer text-sm font-medium">Дополнительно</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Select label="Позиция" value={value.itemId} onChange={(event) => onChange({ itemId: event.target.value })}>
            <option value="">Все</option>
            {items.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
          </Select>
          <Select label="Статья" value={value.expenseArticleId} onChange={(event) => onChange({ expenseArticleId: event.target.value })}>
            <option value="">Все</option>
            {expenseArticles.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
          </Select>
          <Select label="Назначение" value={value.purposeId} onChange={(event) => onChange({ purposeId: event.target.value })}>
            <option value="">Все</option>
            {purposes.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
          </Select>
        </div>
      </details>
    </div>
  );
}
