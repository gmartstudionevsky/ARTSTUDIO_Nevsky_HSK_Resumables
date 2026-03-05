import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { formatQty } from '@/lib/qty/format';
import { StockListItem } from '@/lib/stock/types';

function statusBadge(status: StockListItem['status']): { label: string; variant: 'ok' | 'warn' | 'neutral' } {
  if (status === 'BELOW_MIN') return { label: 'Ниже минимума', variant: 'warn' };
  if (status === 'ZERO') return { label: 'Ноль', variant: 'neutral' };
  return { label: 'ОК', variant: 'ok' };
}

export function StockTable({ items, decimals }: { items: StockListItem[]; decimals: number }): JSX.Element {
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
      <table className="min-w-full text-sm">
        <thead className="bg-surface text-left text-muted">
          <tr>
            <th className="px-4 py-3">Позиция</th>
            <th className="px-4 py-3">Раздел</th>
            <th className="px-4 py-3">Остаток</th>
            <th className="px-4 py-3">Ед. отчётности</th>
            <th className="px-4 py-3">Статус</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody data-testid="stock-list">
          {items.map((item) => {
            const badge = statusBadge(item.status);
            return (
              <tr key={item.itemId} className="border-t border-border" data-testid={`stock-item-${item.itemId}`}>
                <td className="px-4 py-3">{item.code} · {item.name}</td>
                <td className="px-4 py-3">{item.category.name}</td>
                <td className="px-4 py-3 font-medium" data-testid={`stock-qty-${item.itemId}`}>{formatQty(item.qtyReport, decimals)}</td>
                <td className="px-4 py-3">{item.reportUnit.name}</td>
                <td className="px-4 py-3"><Badge variant={badge.variant}>{badge.label}</Badge></td>
                <td className="px-4 py-3 text-right"><Link className="text-accent underline" href={`/items/${item.itemId}`}>Открыть</Link></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
