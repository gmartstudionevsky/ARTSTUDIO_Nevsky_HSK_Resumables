import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { HelpTip } from '@/components/ui/Tooltip';

export default function InventoryPage(): JSX.Element {
  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Инвентаризация</CardTitle>
            <Badge variant="neutral">Планируется</Badge>
          </div>
          <CardDescription>Запуск и контроль инвентаризаций по зонам хранения.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="flex items-center gap-2">
            Назначение
            <HelpTip label="Подсказка к назначению">Позволяет разделить проверку по видам материалов и участкам.</HelpTip>
          </p>
          <p className="flex items-center gap-2">
            Единица отчётности
            <HelpTip label="Подсказка к единице отчётности">Итоговая сверка фиксируется в едином формате, без пересчётов в отчёте.</HelpTip>
          </p>
        </CardContent>
        <CardFooter>
          <Button>Начать цикл</Button>
          <Button variant="secondary">Сценарии</Button>
        </CardFooter>
      </Card>
      <EmptyState
        title="Циклы не запущены"
        description="После запуска первая инвентаризация появится в списке текущих задач."
        actions={<Button variant="ghost">Посмотреть пример</Button>}
      />
    </section>
  );
}
