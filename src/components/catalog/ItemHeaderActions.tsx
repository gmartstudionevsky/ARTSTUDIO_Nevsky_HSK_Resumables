'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export function ItemHeaderActions({ canManage, onOpenCreate }: { canManage: boolean; onOpenCreate: () => void }): JSX.Element {
  return (
    <div className="flex gap-2">
      <Link href="/operation" className="inline-flex min-h-10 items-center text-sm text-accent underline">Добавить позицию из операции</Link>
      {canManage ? <Button onClick={onOpenCreate}>Добавить позицию</Button> : null}
    </div>
  );
}
