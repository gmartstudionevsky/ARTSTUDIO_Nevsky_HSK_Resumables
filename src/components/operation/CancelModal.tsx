'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { LookupItem } from '@/lib/operation/types';

export function CancelModal({ open, reasons, onClose, onSubmit }: { open: boolean; reasons: LookupItem[]; onClose: () => void; onSubmit: (payload: { reasonId?: string; cancelNote?: string }) => void }): JSX.Element | null {
  const [reasonId, setReasonId] = useState('');
  const [cancelNote, setCancelNote] = useState('');
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-3 rounded-lg border border-border bg-bg p-4">
        <h3 className="text-lg font-semibold">Отмена</h3>
        <Select label="Причина" value={reasonId} onChange={(event) => setReasonId(event.target.value)}>
          <option value="">Без причины</option>
          {reasons.map((reason) => <option key={reason.id} value={reason.id}>{reason.code} — {reason.name}</option>)}
        </Select>
        <Input label="Комментарий" value={cancelNote} onChange={(event) => setCancelNote(event.target.value)} />
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Закрыть</Button><Button onClick={() => onSubmit({ reasonId: reasonId || undefined, cancelNote })}>Подтвердить</Button></div>
      </div>
    </div>
  );
}
