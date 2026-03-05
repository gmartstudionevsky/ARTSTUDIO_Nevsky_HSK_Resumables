import { ConsumptionReportRow } from '@/lib/reports/types';

export function ConsumptionTable({ rows }: { rows: ConsumptionReportRow[] }): JSX.Element {
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
      <table className="min-w-full text-sm">
        <thead className="bg-surface text-left text-muted">
          <tr>
            <th className="px-4 py-3">Позиция</th>
            <th className="px-4 py-3">Количество</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.item.id}-${row.reportUnit.id}`} className="border-t border-border">
              <td className="px-4 py-3">
                <span className="font-medium">{row.item.code}</span> — {row.item.name}
              </td>
              <td className="px-4 py-3 font-medium">
                {row.qtyReport} {row.reportUnit.name}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
