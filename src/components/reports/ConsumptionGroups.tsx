import { ConsumptionCards } from '@/components/reports/ConsumptionCards';
import { ConsumptionTable } from '@/components/reports/ConsumptionTable';
import { Card, CardContent } from '@/components/ui/Card';
import { ConsumptionReportGroup } from '@/lib/reports/types';

export function ConsumptionGroups({ groups, decimals }: { groups: ConsumptionReportGroup[]; decimals: number }): JSX.Element {
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <Card key={group.key.id}>
          <details open>
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold">
              {group.key.code} — {group.key.name}
            </summary>
            <CardContent className="space-y-3 border-t border-border p-4">
              <ConsumptionTable rows={group.rows} decimals={decimals} />
              <ConsumptionCards rows={group.rows} decimals={decimals} />
            </CardContent>
          </details>
        </Card>
      ))}
    </div>
  );
}
