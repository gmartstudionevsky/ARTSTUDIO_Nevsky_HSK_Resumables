import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { HistoryListItem } from '@/lib/history/types';

function txTypeLabel(type: HistoryListItem['type']): string {
  if (type === 'IN') return 'Приход';
  if (type === 'OUT') return 'Расход';
  if (type === 'ADJUST') return 'Коррекция';
  if (type === 'OPENING') return 'Открытие';
  return 'Инвентаризация';
}

function statusBadge(status: HistoryListItem['uiStatus']): { label: string; variant: 'ok' | 'warn' | 'neutral' } {
  if (status === 'CANCELLED') return { label: 'Отменено', variant: 'neutral' };
  if (status === 'PARTIAL') return { label: 'Частично', variant: 'warn' };
  return { label: 'Активно', variant: 'ok' };
}

export function HistoryCards({ items }: { items: HistoryListItem[] }): JSX.Element {
  return (
    <div className="grid gap-3 md:hidden">
      {items.map((item) => {
        const badge = statusBadge(item.uiStatus);
        return (
          <Card key={item.id}>
            <CardContent>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.batchId}</p>
                  <p className="text-xs text-muted">{new Date(item.occurredAt).toLocaleString('ru-RU')}</p>
                </div>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
              <p className="text-sm">{txTypeLabel(item.type)} · {item.createdBy.login}</p>
              <p className="text-sm text-muted">Строки: {item.linesActive}/{item.linesTotal}</p>
              <Link className="text-sm text-accent underline" href={`/history/${item.id}`}>Открыть</Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
