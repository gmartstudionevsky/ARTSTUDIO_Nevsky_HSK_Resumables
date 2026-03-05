import { ItemDetailsClient } from '@/components/catalog/ItemDetailsClient';
import { requireManagerOrAdmin } from '@/lib/auth/guards';

export default async function CatalogItemPage(): Promise<JSX.Element> {
  await requireManagerOrAdmin();
  return <ItemDetailsClient />;
}
