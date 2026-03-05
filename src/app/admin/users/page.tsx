import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

export default function AdminUsersPage(): JSX.Element {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <Link href="/stock" className="inline-flex min-h-10 items-center text-sm font-medium text-muted hover:text-text">
        ← Назад в основную панель
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Пользователи</CardTitle>
          <CardDescription>Раздел управления пользователями будет реализован в следующих блоках.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState title="Пока недоступно" description="Скоро здесь появится CRUD для пользователей и ролей." />
        </CardContent>
      </Card>
    </main>
  );
}
