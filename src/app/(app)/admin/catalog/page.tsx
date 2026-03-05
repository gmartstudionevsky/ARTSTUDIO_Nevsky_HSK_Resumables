import { redirect } from 'next/navigation';

import { requireManagerOrAdmin } from '@/lib/auth/guards';

export default async function AdminCatalogShortcut(): Promise<never> {
  await requireManagerOrAdmin();
  redirect('/catalog');
}
