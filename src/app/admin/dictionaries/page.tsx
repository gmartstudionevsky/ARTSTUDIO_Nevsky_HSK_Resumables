import Link from 'next/link';

import { DictionariesTabs } from '@/components/admin/DictionariesTabs';

export default function AdminDictionariesPage(): JSX.Element {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <Link href="/stock" className="inline-flex min-h-10 items-center text-sm font-medium text-muted hover:text-text">
        ← Назад в основную панель
      </Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-text">Справочники</h1>
        <p className="text-sm text-muted">Управляйте списками, которые используются в операциях и отчётах.</p>
      </header>
      <DictionariesTabs />
    </main>
  );
}
