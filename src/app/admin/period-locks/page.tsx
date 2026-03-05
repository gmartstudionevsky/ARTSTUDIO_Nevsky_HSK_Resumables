import { PeriodLocksGrid } from '@/components/admin/period-locks/PeriodLocksGrid';
import { prisma } from '@/lib/db/prisma';
import { getSettings } from '@/lib/settings/service';

export default async function PeriodLocksPage(): Promise<JSX.Element> {
  const settings = await getSettings(prisma);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Закрытие периода</h1>
      <p className="text-sm text-muted">Запрещает изменения операций в закрытых месяцах (кроме администратора).</p>
      <PeriodLocksGrid enabled={settings.enablePeriodLocks} />
    </section>
  );
}
