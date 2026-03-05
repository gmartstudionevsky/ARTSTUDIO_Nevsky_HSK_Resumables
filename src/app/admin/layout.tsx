import type { PropsWithChildren } from 'react';

import { requireRole } from '@/lib/auth/guards';

export default async function AdminLayout({ children }: PropsWithChildren): Promise<JSX.Element> {
  await requireRole('ADMIN');

  return <>{children}</>;
}
