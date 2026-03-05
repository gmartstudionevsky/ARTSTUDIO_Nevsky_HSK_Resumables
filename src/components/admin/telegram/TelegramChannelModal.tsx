'use client';

import { FormEvent, useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Channel = {
  id: string;
  name: string;
  chatId: string;
  isActive: boolean;
};

type Props = {
  open: boolean;
  channel: Channel | null;
  onClose: () => void;
  onSave: (payload: { name: string; chatId: string; isActive: boolean }) => Promise<string | null>;
};

export function TelegramChannelModal({ open, channel, onClose, onSave }: Props): JSX.Element | null {
  const [name, setName] = useState('');
  const [chatId, setChatId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(channel?.name ?? '');
    setChatId(channel?.chatId ?? '');
    setError('');
  }, [channel, open]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError('');

    if (!name.trim() || !chatId.trim()) {
      setError('Заполните название и chatId');
      return;
    }

    setLoading(true);
    const serverError = await onSave({ name: name.trim(), chatId: chatId.trim(), isActive: channel?.isActive ?? true });
    if (serverError) setError(serverError);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-lg border border-border bg-bg p-5">
        <h2 className="text-lg font-semibold text-text">{channel ? 'Редактировать канал' : 'Добавить канал'}</h2>
        <Input label="Название" value={name} onChange={(event) => setName(event.target.value)} />
        <Input label="Chat ID" value={chatId} onChange={(event) => setChatId(event.target.value)} />
        {error ? <p className="text-sm text-critical">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="submit" loading={loading}>Сохранить</Button>
        </div>
      </form>
    </div>
  );
}
