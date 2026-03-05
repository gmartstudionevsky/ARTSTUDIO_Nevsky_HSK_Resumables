'use client';

import { FormEvent, useEffect, useState } from 'react';

import { DictionaryItem, DictionaryType } from '@/components/admin/DictionariesTabs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface DictionaryFormModalProps {
  open: boolean;
  type: DictionaryType;
  title: string;
  item: DictionaryItem | null;
  onSave: (data: Record<string, unknown>) => Promise<string | null>;
  onClose: () => void;
}

export function DictionaryFormModal({ open, type, title, item, onSave, onClose }: DictionaryFormModalProps): JSX.Element | null {
  const [name, setName] = useState(item?.name ?? '');
  const [code, setCode] = useState(item?.code ?? '');
  const [sortOrder, setSortOrder] = useState(item?.sortOrder?.toString() ?? '0');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(item?.name ?? '');
    setCode(item?.code ?? '');
    setSortOrder(item?.sortOrder?.toString() ?? '0');
    setError('');
  }, [item, open]);

  if (!open) return null;

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError('');

    if (type === 'categories' && name.trim().length < 2) return setError('Название слишком короткое');
    if (type === 'units' && name.trim().length < 1) return setError('Введите название');
    if (type !== 'categories' && type !== 'units' && code.trim().length < 1) return setError('Введите код');
    if (type !== 'categories' && type !== 'units' && name.trim().length < 2) return setError('Название слишком короткое');

    const payload: Record<string, unknown> = {};
    if (name.trim()) payload.name = name.trim();
    if (type === 'categories') payload.sortOrder = Number(sortOrder || '0');
    if (type !== 'categories' && type !== 'units') payload.code = code.trim();

    setLoading(true);
    const serverError = await onSave(payload);
    if (serverError) {
      setError(serverError);
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-lg border border-border bg-bg p-5">
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        {type === 'categories' || type === 'units' ? <Input label="Название" value={name} onChange={(event) => setName(event.target.value)} /> : null}
        {type === 'categories' ? <Input label="Порядок" type="number" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} /> : null}
        {type !== 'categories' && type !== 'units' ? <Input label="Код" value={code} onChange={(event) => setCode(event.target.value)} /> : null}
        {type !== 'categories' && type !== 'units' ? <Input label="Название" value={name} onChange={(event) => setName(event.target.value)} /> : null}
        {error ? <p className="text-sm text-critical">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="submit" loading={loading}>Сохранить</Button>
        </div>
      </form>
    </div>
  );
}
