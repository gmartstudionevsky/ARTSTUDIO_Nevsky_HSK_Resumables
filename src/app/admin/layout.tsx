import Link from 'next/link';
import type { PropsWithChildren } from 'react';

import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { UiTextProvider } from '@/components/ui-texts/UiTextProvider';
import { requireRole } from '@/lib/auth/guards';
import { assertRuntimeEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: PropsWithChildren): Promise<JSX.Element> {
  assertRuntimeEnv();
  await requireRole('ADMIN');

  return (
    <UiTextProvider>
      <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-8 md:grid-cols-[260px_1fr]">
        <div className="space-y-4">
          <Link href="/stock" className="inline-flex min-h-10 items-center text-sm font-medium text-muted hover:text-text">
            ← Назад в основную панель
          </Link>
          <AdminSidebar />
        </div>
        <div>{children}</div>
      </div>
    </UiTextProvider>
  );
}
