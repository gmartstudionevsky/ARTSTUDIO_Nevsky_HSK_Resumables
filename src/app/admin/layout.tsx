import type { PropsWithChildren } from 'react';

import { requireRole } from '@/lib/auth/guards';
import { assertRuntimeEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: PropsWithChildren): Promise<JSX.Element> {
  assertRuntimeEnv();
  await requireRole('ADMIN');

  return <>{children}</>;
}
