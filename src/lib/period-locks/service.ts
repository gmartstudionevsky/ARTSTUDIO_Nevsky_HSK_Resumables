import { PrismaClient } from '@prisma/client';

import { getSettings } from '@/lib/settings/service';

export async function isDateLocked(date: Date, prisma: PrismaClient): Promise<boolean> {
  const settings = await getSettings(prisma);
  if (!settings.enablePeriodLocks) return false;

  const lock = await prisma.periodLock.findUnique({
    where: {
      year_month: {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
      },
    },
  });

  return Boolean(lock?.isLocked);
}
