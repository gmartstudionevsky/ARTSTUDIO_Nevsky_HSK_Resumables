import { prisma } from '@/lib/db/prisma';
import { getProjectionReceipts, getReadModelRecoveryContract } from '@/lib/read-models/projections/update-registry';
import { getSettings } from '@/lib/settings/service';

export async function getAdminControlProjection() {
  const policies = await getSettings(prisma);
  return {
    policies,
    readModel: {
      projectionReceipts: getProjectionReceipts(),
      recoveryContract: getReadModelRecoveryContract(),
    },
  };
}
