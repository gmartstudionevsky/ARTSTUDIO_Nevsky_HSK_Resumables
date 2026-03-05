import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { HelpTip } from '@/components/ui/Tooltip';

export default function ProfilePage(): JSX.Element {
  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Профиль</CardTitle>
            <Badge variant="ok">Активен</Badge>
          </div>
          <CardDescription>Настройки пользователя и персональные параметры интерфейса.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="flex items-center gap-2">
            Назначение
            <HelpTip label="Подсказка к назначению">Определяет рабочую область, где пользователь выполняет основные действия.</HelpTip>
          </p>
          <p className="flex items-center gap-2">
            Единица отчётности
            <HelpTip label="Подсказка к единице отчётности">Личная настройка для отображения количеств в карточках и отчетах.</HelpTip>
          </p>
        </CardContent>
        <CardFooter>
          <Button>Сохранить</Button>
          <Button variant="secondary">Сбросить</Button>
        </CardFooter>
      </Card>
      <EmptyState
        title="Дополнительные настройки недоступны"
        description="Расширенные параметры появятся в следующих итерациях."
        actions={<Button variant="ghost">Прочитать FAQ</Button>}
      />
    </section>
  );
}
