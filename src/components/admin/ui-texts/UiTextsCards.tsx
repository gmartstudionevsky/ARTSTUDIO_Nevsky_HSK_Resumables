'use client';

import { UiTextItem } from '@/lib/ui-texts/types';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface UiTextsCardsProps {
  items: UiTextItem[];
  onEdit: (item: UiTextItem) => void;
}

export function UiTextsCards({ items, onEdit }: UiTextsCardsProps): JSX.Element {
  return (
    <div className="space-y-3 md:hidden">
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader className="mb-2">
            <CardTitle className="font-mono text-sm">{item.key}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><span className="text-muted">Scope:</span> {item.scope}</p>
            <p>{item.ruText}</p>
            <p className="text-xs text-muted">Обновлено: {new Date(item.updatedAt).toLocaleString('ru-RU')}</p>
            <Button variant="secondary" size="sm" onClick={() => onEdit(item)}>Редактировать</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
