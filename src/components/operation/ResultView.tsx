'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { TxLineView } from '@/lib/operation/types';

export function ResultView({ transaction, lines, onCancelTx, onCancelLine, onCorrectLine }: { transaction: { id: string; batchId: string; type: string }; lines: TxLineView[]; onCancelTx: () => void; onCancelLine: (lineId: string) => void; onCorrectLine: (line: TxLineView) => void }): JSX.Element {
  return (
    <Card>
      <CardHeader><CardTitle>Операция записана</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted">Batch: {transaction.batchId}</p>
        <Button variant="danger" onClick={onCancelTx}>Отменить операцию</Button>
        {lines.map((line) => (
          <div key={line.id} className="rounded-md border border-border p-3 text-sm">
            <p>{line.item.code} — {line.item.name}</p>
            <p className="text-muted">{line.qtyInput} {line.unit.name} · {line.expenseArticle.code} · {line.purpose.code} · {line.status}</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => onCancelLine(line.id)}>Отменить строку</Button>
              <Button size="sm" onClick={() => onCorrectLine(line)}>Исправить</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
