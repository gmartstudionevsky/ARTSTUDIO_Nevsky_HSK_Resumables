import { SettingsForm } from '@/components/admin/settings/SettingsForm';
import { prisma } from '@/lib/db/prisma';
import { getSettings } from '@/lib/settings/service';

export default async function AdminSettingsPage(): Promise<JSX.Element> {
  const policies = await getSettings(prisma);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Политики данных</h1>
      <SettingsForm initial={policies} />
    </section>
  );
}
