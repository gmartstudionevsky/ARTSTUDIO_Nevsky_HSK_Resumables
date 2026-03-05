import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { HelpTip } from '@/components/ui/Tooltip';

export default function StockPage(): JSX.Element {
  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Склад</CardTitle>
            <Badge variant="ok">Онлайн</Badge>
          </div>
          <CardDescription>Обзор остатков и быстрых действий по складу.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="flex items-center gap-2">
            Назначение
            <HelpTip label="Подсказка к назначению">Категория расходника: печать, постобработка, обслуживание.</HelpTip>
          </p>
          <p className="flex items-center gap-2">
            Единица отчётности
            <HelpTip label="Подсказка к единице отчётности">Базовая единица учёта: штука, метр, литр.</HelpTip>
          </p>
        </CardContent>
        <CardFooter>
          <Button size="sm">Создать заявку</Button>
          <Button variant="secondary" size="sm">
            Обновить остатки
          </Button>
        </CardFooter>
      </Card>
      <EmptyState
        title="Пока нет карточек остатков"
        description="После первого поступления здесь появятся позиции и текущие статусы."
        actions={<Button variant="ghost">Открыть справку</Button>}
      />
    </section>
  );
}
