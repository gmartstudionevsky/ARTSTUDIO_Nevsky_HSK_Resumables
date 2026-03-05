import { Badge } from '@/components/ui/Badge';
import { ItemMovement } from '@/lib/items/types';

function mapTxType(type: ItemMovement['tx']['type']): string {
  if (type === 'IN') return 'Приход';
  if (type === 'OUT') return 'Расход';
  if (type === 'ADJUST') return 'Коррекция';
  if (type === 'OPENING') return 'Открытие';
  return 'Инвентаризация';
}

export function ItemMovementsList({ items }: { items: ItemMovement[] }): JSX.Element {
  if (items.length === 0) return <p className="text-sm text-muted">Движений пока нет.</p>;

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.lineId} className="rounded-md border border-border p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{new Date(item.occurredAt).toLocaleString('ru-RU')}</p>
            <Badge variant={item.status === 'CANCELLED' ? 'neutral' : 'ok'}>{item.status === 'CANCELLED' ? 'Отменено' : 'Активно'}</Badge>
          </div>
          <p>{mapTxType(item.tx.type)} · {item.qtyInput} {item.unit.name}</p>
          <p className="text-muted">{item.expenseArticle.code} — {item.expenseArticle.name} · {item.purpose.code} — {item.purpose.name}</p>
        </div>
      ))}
    </div>
  );
}
