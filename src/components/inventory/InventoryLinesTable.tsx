'use client';

import { useRef } from 'react';

import { InventoryLine } from '@/lib/inventory/types';

export function InventoryLinesTable({ lines, unitsByItem, onChange }: { lines: InventoryLine[]; unitsByItem: Record<string, Array<{ unitId: string; unit: { id: string; name: string } }>>; onChange: (lineId: string, patch: { qtyFactInput?: string | null; unitId?: string; apply?: boolean; comment?: string | null }) => void }): JSX.Element {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  return (
    <table className="hidden w-full min-w-[900px] border-collapse text-sm lg:table">
      <thead><tr className="border-b border-border text-left"><th>Позиция</th><th>Система</th><th>Факт</th><th>Ед.</th><th>Отклонение</th><th>Применить</th><th>Комментарий</th></tr></thead>
      <tbody>
        {lines.map((line, index) => <tr key={line.id} className="border-b border-border align-top"><td className="py-2">{line.item.code} — {line.item.name}</td><td>{line.qtySystemBase}</td><td><input ref={(node) => { inputRefs.current[index] = node; }} className="w-24 rounded border border-border px-2 py-1" value={line.qtyFactInput ?? ''} onChange={(e) => onChange(line.id, { qtyFactInput: e.target.value || null })} onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          inputRefs.current[index + 1]?.focus();
        }} /></td><td><select className="rounded border border-border px-2 py-1" value={line.unit.id} onChange={(e) => onChange(line.id, { unitId: e.target.value })}>{(unitsByItem[line.item.id] || []).map((unit) => <option key={unit.unitId} value={unit.unitId}>{unit.unit.name}</option>)}</select></td><td className={line.deltaBase && Number(line.deltaBase) !== 0 ? 'font-semibold text-accent' : ''}>{line.deltaBase ?? '—'}</td><td><input type="checkbox" checked={line.apply} onChange={(e) => onChange(line.id, { apply: e.target.checked })} /></td><td><input className="w-40 rounded border border-border px-2 py-1" value={line.comment ?? ''} onChange={(e) => onChange(line.id, { comment: e.target.value || null })} /></td></tr>)}
      </tbody>
    </table>
  );
}
