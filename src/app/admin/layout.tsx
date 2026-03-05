import Link from 'next/link';
import type { PropsWithChildren } from 'react';

import { requireRole } from '@/lib/auth/guards';
import { assertRuntimeEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: PropsWithChildren): Promise<JSX.Element> {
  assertRuntimeEnv();
  await requireRole('ADMIN');

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-8">
      <Link href="/stock" className="inline-flex min-h-10 items-center text-sm font-medium text-muted hover:text-text">
        ← Назад в основную панель
      </Link>
      {children}
    </div>
  );
}
