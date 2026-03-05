'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useUiText } from '@/components/ui-texts/useUiText';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';

type MeResponse = {
  user: {
    id: string;
    login: string;
    role: string;
  };
};

export default function ProfilePage(): JSX.Element {
  const router = useRouter();
  const [user, setUser] = useState<MeResponse['user'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logoutLoading, setLogoutLoading] = useState(false);

  const reportsLabel = useUiText('nav.reports', 'Отчёты');
  const catalogLabel = useUiText('nav.catalog', 'Номенклатура');

  useEffect(() => {
    async function fetchMe(): Promise<void> {
      const response = await fetch('/api/auth/me', { cache: 'no-store' });

      if (!response.ok) {
        setError('Не удалось загрузить профиль');
        setLoading(false);
        return;
      }

      const data = (await response.json()) as MeResponse;
      setUser(data.user);
      setLoading(false);
    }

    void fetchMe();
  }, []);

  async function handleLogout(): Promise<void> {
    setLogoutLoading(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Профиль</CardTitle>
            <Badge variant="ok">Активен</Badge>
          </div>
          <CardDescription>Информация о текущем пользователе и завершение сессии.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p>Загрузка...</p> : null}
          {error ? <p className="text-critical">{error}</p> : null}
          {user ? (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted">Логин:</span> {user.login}
              </p>
              <p>
                <span className="text-muted">Роль:</span> {user.role}
              </p>
            </div>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button variant="secondary" onClick={handleLogout} loading={logoutLoading}>
            Выйти
          </Button>
        </CardFooter>
      </Card>
      {user ? (
        <Card>
          <CardHeader>
            <CardTitle>Быстрые ссылки</CardTitle>
            <CardDescription>Полезные разделы приложения.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/reports/consumption" className="block text-sm text-accent underline">
              {reportsLabel}
            </Link>
            {user.role === 'ADMIN' || user.role === 'MANAGER' ? (
              <Link href="/catalog" className="block text-sm text-accent underline">
                {catalogLabel}
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
