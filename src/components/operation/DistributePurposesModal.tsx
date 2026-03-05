'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DistributionDraft, LookupItem } from '@/lib/operation/types';

export function DistributePurposesModal({ open, totalQty, purposes, initial, onClose, onSave }: { open: boolean; totalQty: string; purposes: LookupItem[]; initial: DistributionDraft[]; onClose: () => void; onSave: (rows: DistributionDraft[]) => void }): JSX.Element | null {
  const [rows, setRows] = useState<DistributionDraft[]>(initial.length ? initial : [{ purposeId: purposes[0]?.id ?? '', qtyInput: '' }]);
  const sum = useMemo(() => rows.reduce((acc, row) => acc + (Number(row.qtyInput) || 0), 0), [rows]);
  const target = Number(totalQty) || 0;
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl space-y-3 rounded-lg border border-border bg-bg p-4">
        <h3 className="text-lg font-semibold">Распределить по назначениям</h3>
        {rows.map((row, index) => (
          <div key={`${index}-${row.purposeId}`} className="grid gap-2 md:grid-cols-2">
            <Select value={row.purposeId} onChange={(event) => setRows((prev) => prev.map((item, idx) => idx === index ? { ...item, purposeId: event.target.value } : item))}>
              {purposes.map((purpose) => <option key={purpose.id} value={purpose.id}>{purpose.code} — {purpose.name}</option>)}
            </Select>
            <Input value={row.qtyInput} onChange={(event) => setRows((prev) => prev.map((item, idx) => idx === index ? { ...item, qtyInput: event.target.value } : item))} />
          </div>
        ))}
        <p className="text-sm text-muted">Сумма: {sum} / {target}</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setRows((prev) => [...prev, { purposeId: purposes[0]?.id ?? '', qtyInput: '' }])}>Добавить строку</Button>
          <Button onClick={() => onSave(rows)} disabled={Math.abs(sum - target) > 0.0001}>Сохранить</Button>
          <Button variant="ghost" onClick={onClose}>Закрыть</Button>
        </div>
      </div>
    </div>
  );
}
