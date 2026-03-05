'use client';

import { DictionaryItem, DictionaryType } from '@/components/admin/DictionariesTabs';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface DictionaryCardsProps {
  type: DictionaryType;
  items: DictionaryItem[];
  onEdit: (item: DictionaryItem) => void;
  onToggle: (item: DictionaryItem) => void;
}

export function DictionaryCards({ type, items, onEdit, onToggle }: DictionaryCardsProps): JSX.Element {
  return (
    <div className="space-y-3 md:hidden">
      {items.map((item) => (
        <Card key={item.id} className="space-y-2">
          {type === 'categories' || type === 'units' ? <p className="text-sm font-medium text-text">{item.name}</p> : null}
          {type === 'categories' ? <p className="text-sm text-muted">Порядок: {item.sortOrder ?? 0}</p> : null}
          {type !== 'categories' && type !== 'units' ? <p className="text-sm text-muted">Код: {item.code}</p> : null}
          {type !== 'categories' && type !== 'units' ? <p className="text-sm text-text">{item.name}</p> : null}
          <div>{item.isActive ? <Badge variant="ok">Активна</Badge> : <Badge variant="neutral">Архив</Badge>}</div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => onEdit(item)}>Редактировать</Button>
            <Button variant="ghost" size="sm" onClick={() => onToggle(item)}>{item.isActive ? 'В архив' : 'Вернуть'}</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
