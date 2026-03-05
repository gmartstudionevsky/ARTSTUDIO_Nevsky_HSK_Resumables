import type { PropsWithChildren } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { requireUser } from '@/lib/auth/guards';
import { assertRuntimeEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: PropsWithChildren): Promise<JSX.Element> {
  assertRuntimeEnv();
  await requireUser();

  return <AppShell>{children}</AppShell>;
}
