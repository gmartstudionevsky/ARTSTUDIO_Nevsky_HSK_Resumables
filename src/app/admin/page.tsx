'use client';

import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useUiText } from '@/components/ui-texts/useUiText';
import { HelpTip } from '@/components/ui/Tooltip';

export default function AdminPage(): JSX.Element {
  const purposeTooltip = useUiText('tooltip.purpose', 'Назначение — для какого направления/участка учитывается расход.');
  const reportUnitTooltip = useUiText('tooltip.reportUnit', 'Единица отчётности — в ней показывается склад и отчёты.');
  const expenseArticleTooltip = useUiText('tooltip.expenseArticle', 'Статья расходов — финансовый разрез для отчёта.');

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
            <HelpTip label="Подсказка к назначению">{purposeTooltip}</HelpTip>
          </p>
          <p className="flex items-center gap-2">
            Единица отчётности
            <HelpTip label="Подсказка к единице отчётности">{reportUnitTooltip}</HelpTip>
          </p>
          <p className="flex items-center gap-2">
            Статья расходов
            <HelpTip label="Подсказка к статье расходов">{expenseArticleTooltip}</HelpTip>
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
