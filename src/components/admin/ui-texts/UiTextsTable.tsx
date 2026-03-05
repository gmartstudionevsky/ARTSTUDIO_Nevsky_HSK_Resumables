'use client';

import { formatRuDateTime } from '@/lib/datetime/ru';
import { UiTextItem } from '@/lib/ui-texts/types';

import { Button } from '@/components/ui/Button';

interface UiTextsTableProps {
  items: UiTextItem[];
  onEdit: (item: UiTextItem) => void;
}

export function UiTextsTable({ items, onEdit }: UiTextsTableProps): JSX.Element {
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
      <table className="min-w-full text-sm">
        <thead className="bg-surface text-left text-muted">
          <tr>
            <th className="px-3 py-2">Ключ</th>
            <th className="px-3 py-2">Область</th>
            <th className="px-3 py-2">Текст</th>
            <th className="px-3 py-2">Обновлено</th>
            <th className="px-3 py-2">Действия</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-border">
              <td className="px-3 py-2 font-mono text-xs">{item.key}</td>
              <td className="px-3 py-2">{item.scope}</td>
              <td className="px-3 py-2">{item.ruText}</td>
              <td className="px-3 py-2 text-muted">{formatRuDateTime(item.updatedAt)}</td>
              <td className="px-3 py-2">
                <Button variant="secondary" size="sm" onClick={() => onEdit(item)}>Редактировать</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
