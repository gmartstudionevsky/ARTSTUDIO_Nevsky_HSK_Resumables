import { HistoryDetailPageClient } from '@/components/history/HistoryDetailPageClient';
import { requireSupervisorOrAbove } from '@/lib/auth/guards';

export default async function HistoryDetailPage(): Promise<JSX.Element> {
  await requireSupervisorOrAbove();
  return <HistoryDetailPageClient />;
}
