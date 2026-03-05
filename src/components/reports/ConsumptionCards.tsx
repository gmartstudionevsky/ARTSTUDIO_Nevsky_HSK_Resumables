import { Card, CardContent } from '@/components/ui/Card';
import { ConsumptionReportRow } from '@/lib/reports/types';

export function ConsumptionCards({ rows }: { rows: ConsumptionReportRow[] }): JSX.Element {
  return (
    <div className="space-y-3 md:hidden">
      {rows.map((row) => (
        <Card key={`${row.item.id}-${row.reportUnit.id}`}>
          <CardContent className="space-y-2 p-4">
            <p className="text-sm">
              <span className="font-medium">{row.item.code}</span> — {row.item.name}
            </p>
            <p className="text-sm font-semibold">
              {row.qtyReport} {row.reportUnit.name}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
