import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { HelpTip } from '@/components/ui/Tooltip';

export default function AdminUsersPage(): JSX.Element {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <Link href="/stock" className="inline-flex min-h-10 items-center text-sm font-medium text-muted hover:text-text">
        ← Назад в основную панель
      </Link>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Пользователи</CardTitle>
            <Badge variant="critical">В разработке</Badge>
          </div>
          <CardDescription>Управление пользователями административного раздела.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="flex items-center gap-2">
            Назначение
            <HelpTip label="Подсказка к назначению">Показывает роль сотрудника в процессах и шаблонах интерфейса.</HelpTip>
          </p>
          <p className="flex items-center gap-2">
            Единица отчётности
            <HelpTip label="Подсказка к единице отчётности">Единый формат для норм, ограничений и уведомлений в профиле.</HelpTip>
          </p>
        </CardContent>
        <CardFooter>
          <Button>Пригласить</Button>
          <Button variant="secondary">Выгрузка</Button>
        </CardFooter>
      </Card>
      <EmptyState title="Пользователи не добавлены" description="Список участников появится после первой синхронизации." />
    </main>
  );
}
