import type { PropsWithChildren } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { requireUser } from '@/lib/auth/guards';

export default async function AppLayout({ children }: PropsWithChildren): Promise<JSX.Element> {
  await requireUser();

  return <AppShell>{children}</AppShell>;
}
