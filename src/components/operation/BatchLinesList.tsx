'use client';

import { BatchLineDraft } from '@/lib/operation/types';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export function BatchLinesList({ lines, onEdit, onDelete }: { lines: BatchLineDraft[]; onEdit: (line: BatchLineDraft) => void; onDelete: (lineId: string) => void }): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Строки batch</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {lines.map((line) => (
          <div key={line.localId} className="rounded-md border border-border p-3 text-sm">
            <p className="font-medium">{line.itemLabel}</p>
            <p className="text-muted">{line.qtyInput} {line.unitName} · {line.expenseArticleLabel} · {line.purposeLabel}</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => onEdit(line)}>Редактировать</Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(line.localId)}>Удалить из batch</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
