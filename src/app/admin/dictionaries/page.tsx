import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { HelpTip } from '@/components/ui/Tooltip';

export default function AdminDictionariesPage(): JSX.Element {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <Link href="/stock" className="inline-flex min-h-10 items-center text-sm font-medium text-muted hover:text-text">
        ← Назад в основную панель
      </Link>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Справочники</CardTitle>
            <Badge variant="neutral">MVP</Badge>
          </div>
          <CardDescription>Административные справочники системы.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="flex items-center gap-2">
            Назначение
            <HelpTip label="Подсказка к назначению">Поле описывает область применения справочника в процессах студии.</HelpTip>
          </p>
          <p className="flex items-center gap-2">
            Единица отчётности
            <HelpTip label="Подсказка к единице отчётности">Определяет формат данных для единообразия отчётов и карточек.</HelpTip>
          </p>
        </CardContent>
        <CardFooter>
          <Button>Добавить тип</Button>
          <Button variant="secondary">Импорт</Button>
        </CardFooter>
      </Card>
      <EmptyState title="Справочники пусты" description="Создайте первую категорию, чтобы начать наполнение структуры." />
    </main>
  );
}
