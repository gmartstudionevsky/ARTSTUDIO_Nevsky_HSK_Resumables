'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

export default function LoginPage(): JSX.Element {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError('');

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password }),
    });

    const data = (await response.json()) as { error?: string; ok?: boolean; mustChangePassword?: boolean };

    if (!response.ok || !data.ok) {
      setError(data.error ?? 'Не удалось войти. Проверьте логин и пароль.');
      setLoading(false);
      return;
    }

    if (data.mustChangePassword) {
      router.replace('/change-password');
      router.refresh();
      return;
    }

    router.replace('/stock');
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Вход в систему</CardTitle>
          <CardDescription>Введите логин и пароль, чтобы продолжить работу.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input label="Логин" value={login} onChange={(event) => setLogin(event.target.value)} required autoComplete="username" data-testid="login-login" />
            <Input
              label="Пароль"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              data-testid="login-password"
            />
            {error ? <p data-testid="login-error" className="rounded-md border border-critical bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p> : null}
            <Button type="submit" className="w-full" loading={loading} data-testid="login-submit">
              Войти
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
