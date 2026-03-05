'use client';

import { TelegramEventType } from '@prisma/client';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { TelegramChannelModal } from '@/components/admin/telegram/TelegramChannelModal';
import { TelegramChannelsTable, TelegramChannelItem } from '@/components/admin/telegram/TelegramChannelsTable';
import { TelegramRulesPanel } from '@/components/admin/telegram/TelegramRulesPanel';
import { TelegramStatusCard } from '@/components/admin/telegram/TelegramStatusCard';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';

type StatusPayload = { hasBotToken: boolean; appUrl: string | null };
type RuleItem = { eventType: TelegramEventType; isEnabled: boolean };

const emptyRules: Record<TelegramEventType, boolean> = {
  TX_CREATED: false,
  DIGEST_BELOW_MIN: false,
  DIGEST_ZERO: false,
};

export default function TelegramIntegrationPage(): JSX.Element {
  const [status, setStatus] = useState<StatusPayload>({ hasBotToken: false, appUrl: null });
  const [channels, setChannels] = useState<TelegramChannelItem[]>([]);
  const [active, setActive] = useState<'true' | 'false' | 'all'>('all');
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rules, setRules] = useState<Record<TelegramEventType, boolean>>(emptyRules);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<TelegramChannelItem | null>(null);
  const [toast, setToast] = useState('');

  const selectedChannel = useMemo(() => channels.find((item) => item.id === selectedId) ?? null, [channels, selectedId]);

  const loadStatus = useCallback(async (): Promise<void> => {
    const response = await fetch('/api/admin/telegram/status', { cache: 'no-store' });
    const payload = (await response.json().catch(() => null)) as StatusPayload | null;
    if (response.ok && payload) setStatus(payload);
  }, []);

  const loadChannels = useCallback(async (): Promise<void> => {
    const params = new URLSearchParams({ q, active });
    const response = await fetch(`/api/admin/telegram/channels?${params.toString()}`, { cache: 'no-store' });
    const payload = (await response.json().catch(() => null)) as { items?: TelegramChannelItem[] } | null;
    setChannels(payload?.items ?? []);
  }, [active, q]);

  const loadRules = useCallback(async (channelId: string): Promise<void> => {
    const response = await fetch(`/api/admin/telegram/channels/${channelId}/rules`, { cache: 'no-store' });
    const payload = (await response.json().catch(() => null)) as { items?: RuleItem[] } | null;
    const next = { ...emptyRules };
    for (const rule of payload?.items ?? []) next[rule.eventType] = rule.isEnabled;
    setRules(next);
  }, []);

  useEffect(() => { void loadStatus(); }, [loadStatus]);
  useEffect(() => { const timer = setTimeout(() => void loadChannels(), 250); return () => clearTimeout(timer); }, [loadChannels]);
  useEffect(() => { if (selectedId) void loadRules(selectedId); }, [selectedId, loadRules]);

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-text">Telegram</h1>
        <p className="text-sm text-muted">Каналы, правила и отправка уведомлений.</p>
      </header>

      <TelegramStatusCard hasBotToken={status.hasBotToken} appUrl={status.appUrl} />

      <Card>
        <CardHeader><CardTitle>Каналы</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto_auto]">
            <Input label="Поиск" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Название или chatId" />
            <Select label="Статус" value={active} onChange={(event) => setActive(event.target.value as 'true' | 'false' | 'all')}>
              <option value="all">Все</option>
              <option value="true">Активные</option>
              <option value="false">Архив</option>
            </Select>
            <Button className="md:mt-7" variant="secondary" onClick={() => void loadChannels()}>Обновить</Button>
            <Button className="md:mt-7" onClick={() => { setEditItem(null); setModalOpen(true); }}>Добавить канал</Button>
          </div>
          <TelegramChannelsTable
            items={channels}
            onEdit={(item) => { setEditItem(item); setModalOpen(true); }}
            onToggle={async (item) => {
              await fetch(`/api/admin/telegram/channels/${item.id}/toggle-active`, { method: 'POST' });
              setToast(item.isActive ? 'Канал перемещён в архив' : 'Канал восстановлен');
              await loadChannels();
            }}
            onTest={async (item) => {
              const response = await fetch('/api/integrations/telegram/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channelId: item.id }),
              });
              setToast(response.ok ? 'Тестовое сообщение отправлено' : 'Не удалось отправить тестовое сообщение');
            }}
          />
          <div className="mt-3">
            <Select label="Выберите канал для правил" value={selectedId ?? ''} onChange={(event) => setSelectedId(event.target.value || null)}>
              <option value="">Не выбран</option>
              {channels.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedChannel ? (
        <TelegramRulesPanel
          value={rules}
          onChange={setRules}
          onSave={async () => {
            const payload = {
              rules: [
                { eventType: TelegramEventType.TX_CREATED, isEnabled: rules.TX_CREATED },
                { eventType: TelegramEventType.DIGEST_BELOW_MIN, isEnabled: rules.DIGEST_BELOW_MIN },
                { eventType: TelegramEventType.DIGEST_ZERO, isEnabled: rules.DIGEST_ZERO },
              ],
            };
            const response = await fetch(`/api/admin/telegram/channels/${selectedChannel.id}/rules`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            setToast(response.ok ? 'Правила сохранены' : 'Не удалось сохранить правила');
          }}
        />
      ) : null}

      <div className="flex gap-2">
        <Button
          onClick={async () => {
            const response = await fetch('/api/admin/telegram/run-digest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
            setToast(response.ok ? 'Дайджест отправлен' : 'Не удалось отправить дайджест');
          }}
        >
          Отправить дайджест сейчас
        </Button>
      </div>

      <TelegramChannelModal
        open={modalOpen}
        channel={editItem}
        onClose={() => { setModalOpen(false); setEditItem(null); }}
        onSave={async (payload) => {
          const response = await fetch(editItem ? `/api/admin/telegram/channels/${editItem.id}` : '/api/admin/telegram/channels', {
            method: editItem ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          if (!response.ok) return body?.error ?? 'Ошибка сохранения';
          setModalOpen(false);
          setEditItem(null);
          await loadChannels();
          setToast('Канал сохранён');
          return null;
        }}
      />

      {toast ? <Toast message={toast} onClose={() => setToast('')} /> : null}
    </main>
  );
}
