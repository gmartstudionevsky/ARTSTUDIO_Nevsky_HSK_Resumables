import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
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

export function HistoryTable({ items }: { items: HistoryListItem[] }): JSX.Element {
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
      <table className="min-w-full text-sm">
        <thead className="bg-surface text-left text-muted">
          <tr>
            <th className="px-4 py-3">Дата/время</th>
            <th className="px-4 py-3">Batch</th>
            <th className="px-4 py-3">Тип</th>
            <th className="px-4 py-3">Пользователь</th>
            <th className="px-4 py-3">Статус</th>
            <th className="px-4 py-3">Строк</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const badge = statusBadge(item.uiStatus);
            return (
              <tr key={item.id} className="border-t border-border">
                <td className="px-4 py-3">{new Date(item.occurredAt).toLocaleString('ru-RU')}</td>
                <td className="px-4 py-3 font-medium">{item.batchId}</td>
                <td className="px-4 py-3">{txTypeLabel(item.type)}</td>
                <td className="px-4 py-3">{item.createdBy.login}</td>
                <td className="px-4 py-3"><Badge variant={badge.variant}>{badge.label}</Badge></td>
                <td className="px-4 py-3">{item.linesActive}/{item.linesTotal}</td>
                <td className="px-4 py-3 text-right"><Link className="text-accent underline" href={`/history/${item.id}`}>Открыть</Link></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
