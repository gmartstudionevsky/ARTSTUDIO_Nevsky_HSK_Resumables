import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

type Props = {
  hasBotToken: boolean;
  appUrl: string | null;
};

export function TelegramStatusCard({ hasBotToken, appUrl }: Props): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Статус интеграции</CardTitle>
      </CardHeader>
      <CardContent>
        <p>TELEGRAM_BOT_TOKEN: <b>{hasBotToken ? 'задан' : 'не задан'}</b></p>
        <p>APP_URL: <b>{appUrl ?? 'не задан'}</b></p>
      </CardContent>
    </Card>
  );
}
