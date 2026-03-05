import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { StockListItem } from '@/lib/stock/types';

function statusBadge(status: StockListItem['status']): { label: string; variant: 'ok' | 'warn' | 'neutral' } {
  if (status === 'BELOW_MIN') return { label: 'Ниже минимума', variant: 'warn' };
  if (status === 'ZERO') return { label: 'Ноль', variant: 'neutral' };
  return { label: 'ОК', variant: 'ok' };
}

export function StockCards({ items }: { items: StockListItem[] }): JSX.Element {
  return (
    <div className="grid gap-3 md:hidden">
      {items.map((item) => {
        const badge = statusBadge(item.status);
        return (
          <Card key={item.itemId}>
            <CardContent>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.code} · {item.name}</p>
                  <p className="text-xs text-muted">{item.category.name}</p>
                </div>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
              <p className="text-sm">Остаток: <span className="font-semibold">{item.qtyReport} {item.reportUnit.name}</span></p>
              <Link className="text-sm text-accent underline" href={`/items/${item.itemId}`}>Открыть</Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
