'use client';

import { FormEvent, useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { UiTextItem, UiTextScope } from '@/lib/ui-texts/types';

interface UiTextModalProps {
  open: boolean;
  item: UiTextItem | null;
  onClose: () => void;
  onSave: (data: { key?: string; ruText: string; scope: UiTextScope }) => Promise<string | null>;
}

export function UiTextModal({ open, item, onClose, onSave }: UiTextModalProps): JSX.Element | null {
  const [key, setKey] = useState(item?.key ?? '');
  const [ruText, setRuText] = useState(item?.ruText ?? '');
  const [scope, setScope] = useState<UiTextScope>(item?.scope ?? 'BOTH');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setKey(item?.key ?? '');
    setRuText(item?.ruText ?? '');
    setScope(item?.scope ?? 'BOTH');
    setError('');
  }, [item, open]);

  if (!open) return null;

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError('');

    if (!item && !/^[a-z0-9._-]{3,80}$/.test(key.trim())) {
      setError('Ключ: 3..80, латиница/цифры/точки/дефисы/подчёркивания');
      return;
    }

    if (ruText.trim().length < 1 || ruText.trim().length > 400) {
      setError('Текст: 1..400 символов');
      return;
    }

    setLoading(true);
    const serverError = await onSave({ key: item ? undefined : key.trim(), ruText: ruText.trim(), scope });
    if (serverError) setError(serverError);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-lg space-y-4 rounded-lg border border-border bg-bg p-5">
        <h2 className="text-lg font-semibold text-text">{item ? 'Редактировать текст' : 'Добавить текст'}</h2>
        <Input
          label="Key"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          readOnly={Boolean(item)}
          helperText="Формат: a-z, 0-9, точка, дефис, подчёркивание"
        />
        <Select label="Scope" value={scope} onChange={(event) => setScope(event.target.value as UiTextScope)}>
          <option value="BOTH">BOTH</option>
          <option value="WEB">WEB</option>
          <option value="MOBILE">MOBILE</option>
        </Select>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text" htmlFor="ui-text-ru">Текст</label>
          <textarea
            id="ui-text-ru"
            className="min-h-28 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            value={ruText}
            onChange={(event) => setRuText(event.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-critical">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="submit" loading={loading}>Сохранить</Button>
        </div>
      </form>
    </div>
  );
}
