'use client';

import { TelegramEventType } from '@prisma/client';

import { Button } from '@/components/ui/Button';

type Props = {
  value: Record<TelegramEventType, boolean>;
  onChange: (next: Record<TelegramEventType, boolean>) => void;
  onSave: () => Promise<void>;
};

export function TelegramRulesPanel({ value, onChange, onSave }: Props): JSX.Element {
  function setRule(type: TelegramEventType, checked: boolean): void {
    onChange({ ...value, [type]: checked });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <h3 className="text-base font-semibold">Правила канала</h3>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.TX_CREATED} onChange={(e) => setRule(TelegramEventType.TX_CREATED, e.target.checked)} /> Уведомлять о новых операциях</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.DIGEST_BELOW_MIN} onChange={(e) => setRule(TelegramEventType.DIGEST_BELOW_MIN, e.target.checked)} /> Ежедневно: ниже минимума</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.DIGEST_ZERO} onChange={(e) => setRule(TelegramEventType.DIGEST_ZERO, e.target.checked)} /> Ежедневно: нулевые</label>
      <Button size="sm" onClick={() => void onSave()}>Сохранить правила</Button>
    </div>
  );
}
