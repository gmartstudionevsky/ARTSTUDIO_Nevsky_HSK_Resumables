import { ImportSummary as Summary } from '@/lib/import/types';

import { Card } from '@/components/ui/Card';

export function ImportSummary({ summary }: { summary: Summary }): JSX.Element {
  const entries = [
    ['Позиции', summary.items],
    ['Категории', summary.categories],
    ['Единицы', summary.units],
    ['Статьи затрат', summary.expenseArticles],
    ['Разделы', summary.purposes],
    ['Строки единиц', summary.itemUnits],
    ['OPENING строки', summary.openingLines],
    ['Синх. сопоставлено', summary.syncMatched],
    ['Синх. создано', summary.syncCreated],
    ['Синх. пропущено', summary.syncSkipped],
    ['Требуют решения', summary.syncNeedsReview],
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {entries.map(([label, value]) => (
        <Card key={label} className="p-4">
          <p className="text-xs text-muted">{label}</p>
          <p className="mt-1 text-xl font-semibold text-text">{value}</p>
        </Card>
      ))}
    </div>
  );
}
