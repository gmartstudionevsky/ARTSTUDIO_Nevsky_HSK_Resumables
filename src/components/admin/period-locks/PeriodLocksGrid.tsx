'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

type MonthLock = { month: number; isLocked: boolean; lockedAt: string | null; lockedBy: { login: string } | null; note: string | null };

export function PeriodLocksGrid({ enabled }: { enabled: boolean }): JSX.Element {
  const [year, setYear] = useState(new Date().getFullYear());
  const [months, setMonths] = useState<MonthLock[]>([]);

  async function load(y: number): Promise<void> {
    const res = await fetch(`/api/admin/period-locks?year=${y}`, { cache: 'no-store' });
    const data = await res.json();
    setMonths(data.months);
  }

  useEffect(() => { void load(year); }, [year]);

  async function toggle(month: number, isLocked: boolean): Promise<void> {
    await fetch(`/api/admin/period-locks/${isLocked ? 'unlock' : 'lock'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, note: isLocked ? undefined : 'Закрыто из админки' }),
    });
    await load(year);
  }

  return (
    <div className="space-y-4">
      {!enabled ? <div className="rounded border border-warn p-3 text-sm">Закрытие периода выключено в политиках. Замки можно настроить заранее.</div> : null}
      <label className="text-sm">Год <input className="ml-2 rounded border px-2 py-1" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></label>
      <div className="grid gap-3 md:grid-cols-3">
        {months.map((m) => (
          <Card key={m.month}><CardContent className="space-y-2 p-3"><p className="font-medium">{new Date(year, m.month - 1, 1).toLocaleDateString('ru-RU', { month: 'long' })}</p><p className="text-sm">Статус: {m.isLocked ? 'Закрыт' : 'Открыт'}</p><p className="text-xs text-muted">{m.lockedBy ? `${m.lockedBy.login} · ${m.lockedAt ? new Date(m.lockedAt).toLocaleString('ru-RU') : ''}` : '—'}</p><Button variant={m.isLocked ? 'secondary' : 'danger'} onClick={() => void toggle(m.month, m.isLocked)}>{m.isLocked ? 'Открыть' : 'Закрыть'}</Button></CardContent></Card>
        ))}
      </div>
    </div>
  );
}
