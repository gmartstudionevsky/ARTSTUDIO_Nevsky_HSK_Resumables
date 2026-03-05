import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { HelpTip } from '@/components/ui/Tooltip';

export default function AdminPage(): JSX.Element {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <Link href="/stock" className="inline-flex min-h-10 items-center text-sm font-medium text-muted hover:text-text">
        ← Назад в основную панель
      </Link>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Админ-панель</CardTitle>
            <Badge variant="warn">Ограниченный доступ</Badge>
          </div>
          <CardDescription>Управление административными разделами приложения.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="flex items-center gap-2">
            Назначение
            <HelpTip label="Подсказка к назначению">Служит для группировки настроек по зонам ответственности команды.</HelpTip>
          </p>
          <p className="flex items-center gap-2">
            Единица отчётности
            <HelpTip label="Подсказка к единице отчётности">Показывает, в каком формате хранить нормы и лимиты в справочниках.</HelpTip>
          </p>
        </CardContent>
        <CardFooter>
          <Button>Открыть раздел</Button>
          <Button variant="secondary">Журнал админа</Button>
        </CardFooter>
      </Card>
      <EmptyState title="Разделы скоро появятся" description="Добавьте первый административный модуль, чтобы начать настройку." />
    </main>
  );
}
