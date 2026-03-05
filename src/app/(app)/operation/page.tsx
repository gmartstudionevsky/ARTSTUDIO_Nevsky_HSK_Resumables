import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { HelpTip } from '@/components/ui/Tooltip';

export default function OperationPage(): JSX.Element {
  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Операция</CardTitle>
            <Badge variant="warn">MVP</Badge>
          </div>
          <CardDescription>Выполнение расхода, прихода и перемещений.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="flex items-center gap-2">
            Назначение
            <HelpTip label="Подсказка к назначению">Уточняет, для какого этапа производства выполняется операция.</HelpTip>
          </p>
          <p className="flex items-center gap-2">
            Единица отчётности
            <HelpTip label="Подсказка к единице отчётности">Операция списывает количество в одной согласованной единице измерения.</HelpTip>
          </p>
        </CardContent>
        <CardFooter>
          <Button>Новая операция</Button>
          <Button variant="secondary">Черновики</Button>
        </CardFooter>
      </Card>
      <EmptyState
        title="Операций пока нет"
        description="Создайте первую операцию, чтобы увидеть ленту выполнения."
        actions={<Button variant="ghost">Открыть шаблоны</Button>}
      />
    </section>
  );
}
