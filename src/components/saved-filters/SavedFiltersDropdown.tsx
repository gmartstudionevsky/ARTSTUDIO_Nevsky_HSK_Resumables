'use client';

import { SavedFilterItem } from '@/lib/saved-filters/types';

export function SavedFiltersDropdown({
  items,
  value,
  onChange,
  onApply,
  onRename,
  onDelete,
  onMakeDefault,
  testId,
}: {
  items: SavedFilterItem[];
  value: string;
  onChange: (id: string) => void;
  onApply: () => void;
  onRename: () => void;
  onDelete: () => void;
  onMakeDefault: () => void;
  testId: string;
}): JSX.Element {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex min-w-56 flex-col gap-1 text-sm">
        <span>Сохранённые</span>
        <select className="rounded-md border border-border bg-bg px-3 py-2" data-testid={testId} value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Выберите фильтр</option>
          {items.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isDefault ? ' (default)' : ''}</option>)}
        </select>
      </label>
      <button type="button" className="rounded-md border border-border px-3 py-2 text-sm" onClick={onApply} disabled={!value}>Применить</button>
      <button type="button" className="rounded-md border border-border px-3 py-2 text-sm" onClick={onRename} disabled={!value}>Переименовать</button>
      <button type="button" className="rounded-md border border-border px-3 py-2 text-sm" onClick={onMakeDefault} disabled={!value}>Сделать по умолчанию</button>
      <button type="button" className="rounded-md border border-border px-3 py-2 text-sm text-critical" onClick={onDelete} disabled={!value}>Удалить</button>
    </div>
  );
}
