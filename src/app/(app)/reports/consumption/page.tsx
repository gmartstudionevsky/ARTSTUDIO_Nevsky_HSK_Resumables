import { Role } from '@prisma/client';

import { ConsumptionPageClient } from '@/components/reports/ConsumptionPageClient';
import { requireSupervisorOrAbove } from '@/lib/auth/guards';

export default async function ConsumptionReportPage(): Promise<JSX.Element> {
  const user = await requireSupervisorOrAbove();
  const canExport = user.role === Role.MANAGER || user.role === Role.ADMIN;

  return <ConsumptionPageClient canExport={canExport} />;
}
