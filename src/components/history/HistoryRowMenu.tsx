'use client';

import Link from 'next/link';

import { HistoryListItem } from '@/lib/history/types';

export function HistoryRowMenu({ item, onCancel, onFix }: { item: HistoryListItem; onCancel: () => void; onFix: () => void }): JSX.Element {
  return (
    <div className="flex flex-wrap justify-end gap-2" data-testid={`history-row-menu-${item.id}`}>
      {item.uiStatus !== 'CANCELLED' ? <button type="button" data-testid={`history-row-cancel-${item.id}`} className="text-xs text-critical underline" onClick={onCancel}>Отменить операцию</button> : null}
      <button type="button" data-testid={`history-row-fix-${item.id}`} className="text-xs text-accent underline" onClick={onFix}>Исправить…</button>
      <Link className="text-xs underline" href={`/history/${item.id}`}>Открыть</Link>
    </div>
  );
}
