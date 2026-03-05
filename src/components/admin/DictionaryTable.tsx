'use client';

import { DictionaryItem, DictionaryType } from '@/components/admin/DictionariesTabs';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface DictionaryTableProps {
  type: DictionaryType;
  items: DictionaryItem[];
  onEdit: (item: DictionaryItem) => void;
  onToggle: (item: DictionaryItem) => void;
}

export function DictionaryTable({ type, items, onEdit, onToggle }: DictionaryTableProps): JSX.Element {
  return (
    <Card className="hidden overflow-x-auto p-0 md:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-muted">
          <tr>
            {type === 'categories' ? <th className="px-4 py-3">Название</th> : null}
            {type === 'categories' ? <th className="px-4 py-3">Порядок</th> : null}
            {type === 'units' ? <th className="px-4 py-3">Единица</th> : null}
            {type !== 'categories' && type !== 'units' ? <th className="px-4 py-3">Код</th> : null}
            {type !== 'categories' && type !== 'units' ? <th className="px-4 py-3">Название</th> : null}
            <th className="px-4 py-3">Статус</th>
            <th className="px-4 py-3">Действия</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border/70 last:border-0">
              {type === 'categories' ? <td className="px-4 py-3">{item.name}</td> : null}
              {type === 'categories' ? <td className="px-4 py-3">{item.sortOrder ?? 0}</td> : null}
              {type === 'units' ? <td className="px-4 py-3">{item.name}</td> : null}
              {type !== 'categories' && type !== 'units' ? <td className="px-4 py-3">{item.code}</td> : null}
              {type !== 'categories' && type !== 'units' ? <td className="px-4 py-3">{item.name}</td> : null}
              <td className="px-4 py-3">{item.isActive ? <Badge variant="ok">Активна</Badge> : <Badge variant="neutral">Архив</Badge>}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => onEdit(item)}>Редактировать</Button>
                  <Button variant="ghost" size="sm" onClick={() => onToggle(item)}>{item.isActive ? 'В архив' : 'Вернуть'}</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
