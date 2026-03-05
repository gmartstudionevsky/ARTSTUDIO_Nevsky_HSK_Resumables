'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';
import { HelpTip } from '@/components/ui/Tooltip';
import { DataPolicies } from '@/lib/settings/types';

export function SettingsForm({ initial }: { initial: DataPolicies }): JSX.Element {
  const [form, setForm] = useState(initial);
  const [toast, setToast] = useState('');

  async function save(): Promise<void> {
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: [
          { key: 'SUPERVISOR_BACKDATE_DAYS', value: form.supervisorBackdateDays },
          { key: 'REQUIRE_REASON_ON_CANCEL', value: form.requireReasonOnCancel },
          { key: 'ALLOW_NEGATIVE_STOCK', value: form.allowNegativeStock },
          { key: 'DISPLAY_DECIMALS', value: form.displayDecimals },
          { key: 'ENABLE_PERIOD_LOCKS', value: form.enablePeriodLocks },
        ],
      }),
    });
    setToast('Сохранено');
  }

  return (
    <Card>
      <CardHeader><CardTitle>Политики данных</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Input label="Ввод задним числом для супервайзера (дней)" type="number" value={String(form.supervisorBackdateDays)} onChange={(e) => setForm((p) => ({ ...p, supervisorBackdateDays: Number(e.target.value) }))} helperText="Ограничение на создание операций с прошлой датой" />
        <label className="flex items-center justify-between"><span className="flex items-center gap-2">Требовать причину при отмене/исправлении <HelpTip label="Подсказка">Причина обязательна для отмены и исправления строк.</HelpTip></span><input type="checkbox" checked={form.requireReasonOnCancel} onChange={(e) => setForm((p) => ({ ...p, requireReasonOnCancel: e.target.checked }))} /></label>
        <label className="flex items-center justify-between"><span className="flex items-center gap-2">Разрешать уход в минус при списании <HelpTip label="Подсказка">Если выключено — списание ниже остатка запрещено.</HelpTip></span><input type="checkbox" checked={form.allowNegativeStock} onChange={(e) => setForm((p) => ({ ...p, allowNegativeStock: e.target.checked }))} /></label>
        <Select label="Знаков после запятой в интерфейсе" value={String(form.displayDecimals)} onChange={(e) => setForm((p) => ({ ...p, displayDecimals: Number(e.target.value) }))}>{Array.from({ length: 7 }, (_, i) => <option key={i} value={i}>{i}</option>)}</Select>
        <label className="flex items-center justify-between"><span className="flex items-center gap-2">Включить закрытие периода <HelpTip label="Подсказка">Блокирует изменение операций в закрытых месяцах.</HelpTip></span><input type="checkbox" checked={form.enablePeriodLocks} onChange={(e) => setForm((p) => ({ ...p, enablePeriodLocks: e.target.checked }))} /></label>
        <Button onClick={() => void save()}>Сохранить</Button>
      </CardContent>
      {toast ? <Toast message={toast} onClose={() => setToast('')} /> : null}
    </Card>
  );
}
