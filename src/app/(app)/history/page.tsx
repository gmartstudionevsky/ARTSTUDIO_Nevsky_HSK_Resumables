import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { HelpTip } from '@/components/ui/Tooltip';

export default function HistoryPage(): JSX.Element {
  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>История</CardTitle>
            <Badge variant="critical">Черновик</Badge>
          </div>
          <CardDescription>Журнал изменений и операций по расходным материалам.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="flex items-center gap-2">
            Назначение
            <HelpTip label="Подсказка к назначению">Тег для быстрого фильтра событий по бизнес-контексту.</HelpTip>
          </p>
          <p className="flex items-center gap-2">
            Единица отчётности
            <HelpTip label="Подсказка к единице отчётности">Служит для сопоставления факта операции и отчётных показателей.</HelpTip>
          </p>
        </CardContent>
        <CardFooter>
          <Button>Фильтры</Button>
          <Button variant="secondary">Экспорт</Button>
        </CardFooter>
      </Card>
      <EmptyState
        title="История ещё не сформирована"
        description="События появятся после создания первых операций в системе."
        actions={<Button variant="ghost">Обновить ленту</Button>}
      />
    </section>
  );
}
