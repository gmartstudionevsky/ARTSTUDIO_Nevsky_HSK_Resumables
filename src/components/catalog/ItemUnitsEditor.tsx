'use client';

import { RefOption, ItemUnitRow } from '@/components/catalog/types';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

interface Props {
  units: RefOption[];
  value: ItemUnitRow[];
  baseUnitId: string;
  onChange: (rows: ItemUnitRow[]) => void;
}

export function ItemUnitsEditor({ units, value, baseUnitId, onChange }: Props): JSX.Element {
  function patch(index: number, patchValue: Partial<ItemUnitRow>) {
    const rows = value.map((row, i) => i === index ? { ...row, ...patchValue } : row);
    onChange(rows);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">Единица отчётности — в ней показывается склад и отчёты. Единица ввода — предлагается по умолчанию в операциях.</p>
      {value.map((row, index) => (
        <div key={`${row.unitId}-${index}`} className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-5 md:items-end">
          <Select label="Единица" value={row.unitId} onChange={(event) => patch(index, { unitId: event.target.value })}>
            {units.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Input label="Коэффициент" type="number" step="0.000001" value={String(row.factorToBase)} onChange={(event) => patch(index, { factorToBase: Number(event.target.value || 0) })} disabled={row.unitId === baseUnitId} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={row.isAllowed} onChange={(event) => patch(index, { isAllowed: event.target.checked })} /> Разрешена</label>
          <label className="flex items-center gap-2 text-sm"><input type="radio" name="defaultInput" checked={row.isDefaultInput} onChange={() => onChange(value.map((item, i) => ({ ...item, isDefaultInput: i === index })))} /> По умолчанию (ввод)</label>
          <label className="flex items-center gap-2 text-sm"><input type="radio" name="defaultReport" checked={row.isDefaultReport} onChange={() => onChange(value.map((item, i) => ({ ...item, isDefaultReport: i === index })))} /> По умолчанию (отчёт)</label>
        </div>
      ))}
      <Button size="sm" variant="secondary" type="button" onClick={() => onChange([...value, { unitId: units[0]?.id ?? '', factorToBase: 1, isAllowed: true, isDefaultInput: false, isDefaultReport: false }])}>Добавить единицу</Button>
    </div>
  );
}
