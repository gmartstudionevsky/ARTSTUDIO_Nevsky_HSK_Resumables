'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function SaveFilterModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (payload: { name: string; isDefault: boolean }) => void }): JSX.Element | null {
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);


  useEffect(() => {
    if (open) return;
    setName('');
    setIsDefault(false);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-3 rounded-lg border border-border bg-bg p-4">
        <h3 className="text-lg font-semibold">Сохранить фильтр</h3>
        <Input label="Название" data-testid="saved-filter-name" value={name} onChange={(event) => setName(event.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input data-testid="saved-filter-default" type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />
          По умолчанию
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button data-testid="saved-filter-submit" disabled={name.trim().length === 0} onClick={() => onSubmit({ name: name.trim(), isDefault })}>Сохранить</Button>
        </div>
      </div>
    </div>
  );
}
