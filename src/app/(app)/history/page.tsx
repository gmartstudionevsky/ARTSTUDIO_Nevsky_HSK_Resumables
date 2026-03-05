import { HistoryPageClient } from '@/components/history/HistoryPageClient';
import { requireSupervisorOrAbove } from '@/lib/auth/guards';

export default async function HistoryPage(): Promise<JSX.Element> {
  await requireSupervisorOrAbove();
  return <HistoryPageClient />;
}
