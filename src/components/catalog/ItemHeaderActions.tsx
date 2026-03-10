'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export function ItemHeaderActions({ onOpenCreate }: { onOpenCreate: () => void }): JSX.Element {
  return (
    <div className="flex gap-2">
      <Link href="/movements" className="inline-flex min-h-10 items-center text-sm text-accent underline">Добавить позицию из движения</Link>
      <Button data-testid="catalog-add-item" onClick={onOpenCreate}>Добавить позицию</Button>
    </div>
  );
}
