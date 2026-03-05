import { StockPageClient } from '@/components/stock/StockPageClient';
import { requireSupervisorOrAbove } from '@/lib/auth/guards';

export default async function StockPage(): Promise<JSX.Element> {
  await requireSupervisorOrAbove();
  return <StockPageClient />;
}
