import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { HistoryLine } from '@/lib/history/types';

export function TransactionLinesTable({ lines, onCancel, onCorrect }: { lines: HistoryLine[]; onCancel: (line: HistoryLine) => void; onCorrect: (line: HistoryLine) => void }): JSX.Element {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full text-sm">
        <thead className="bg-surface text-left text-muted">
          <tr>
            <th className="px-4 py-3">Позиция</th>
            <th className="px-4 py-3">Количество</th>
            <th className="px-4 py-3">Статья / назначение</th>
            <th className="px-4 py-3">Статус</th>
            <th className="px-4 py-3">Действия</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="border-t border-border align-top">
              <td className="px-4 py-3">
                <Link className="text-accent underline" href={`/items/${line.item.id}`}>{line.item.code} — {line.item.name}</Link>
                {line.correctedFromLineId ? <p className="text-xs text-muted">Исправление строки {line.correctedFromLineId}</p> : null}
              </td>
              <td className="px-4 py-3">{line.qtyInput} {line.unit.name}</td>
              <td className="px-4 py-3">{line.expenseArticle.code} — {line.expenseArticle.name}<br />{line.purpose.code} — {line.purpose.name}</td>
              <td className="px-4 py-3">
                <Badge variant={line.status === 'ACTIVE' ? 'ok' : 'neutral'}>{line.status === 'ACTIVE' ? 'Активно' : 'Отменено'}</Badge>
                {line.status === 'CANCELLED' ? <p className="mt-1 text-xs text-muted">{line.reason ? `${line.reason.code} — ${line.reason.name}` : 'Без причины'} · {line.cancelledBy?.login ?? '-'} · {line.cancelledAt ? new Date(line.cancelledAt).toLocaleString('ru-RU') : '-'}</p> : null}
              </td>
              <td className="px-4 py-3">
                {line.status === 'ACTIVE' ? <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => onCancel(line)}>Отменить строку</Button><Button size="sm" onClick={() => onCorrect(line)}>Исправить</Button></div> : <span className="text-xs text-muted">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
