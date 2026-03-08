'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { TxLineView } from '@/lib/operation/types';

type ResultViewProps = {
  transaction: { id: string; batchId: string; type: string };
  lines: TxLineView[];
  participatingItemIds: string[];
  mode: 'single' | 'multi';
  rollbackAvailable: boolean;
  rollbackBusy: boolean;
  correctionHint?: string;
  onRollbackTx: () => void;
  onHydrateLineForCorrection: (line: TxLineView) => void;
  onCancelLine: (lineId: string) => void;
  onCorrectLine: (line: TxLineView) => void;
};

export function ResultView({
  transaction,
  lines,
  participatingItemIds,
  mode,
  rollbackAvailable,
  rollbackBusy,
  correctionHint,
  onRollbackTx,
  onHydrateLineForCorrection,
  onCancelLine,
  onCorrectLine,
}: ResultViewProps): JSX.Element {
  return (
    <Card data-testid="op-result">
      <CardHeader>
        <CardTitle>Результат проведения</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted" data-testid="op-result-summary">
          {mode === 'single' ? 'Проведена 1 строка.' : `Проведено строк: ${participatingItemIds.length}.`} Batch: {transaction.batchId}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" onClick={onRollbackTx} loading={rollbackBusy} disabled={!rollbackAvailable} data-testid="op-rollback-batch">
            Локально отменить последнее действие
          </Button>
          {!rollbackAvailable ? <p className="text-xs text-muted">Rollback доступен только для movement-сценариев touched safe scope.</p> : null}
        </div>

        <div data-testid="op-result-lines">
          {lines.map((line) => (
            <div key={line.id} className="mb-2 rounded-md border border-border p-3 text-sm" data-testid={`op-result-line-${line.id}`}>
              <p>{line.item.code} — {line.item.name}</p>
              <p className="text-muted">{line.qtyInput} {line.unit.name} · {line.expenseArticle.code} · {line.purpose.code} · {line.status}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => onHydrateLineForCorrection(line)} data-testid={`op-correct-last-${line.id}`}>Исправить в рабочем поле</Button>
                <Button size="sm" variant="secondary" onClick={() => onCancelLine(line.id)}>Отменить строку</Button>
                <Button size="sm" onClick={() => onCorrectLine(line)}>Исправить в модальном редакторе</Button>
              </div>
            </div>
          ))}
        </div>
        {correctionHint ? <p className="text-xs text-muted" data-testid="op-correction-hint">{correctionHint}</p> : null}
      </CardContent>
    </Card>
  );
}
