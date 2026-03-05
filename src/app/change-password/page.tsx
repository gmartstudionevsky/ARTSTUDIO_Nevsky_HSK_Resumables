'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

const MIN_PASSWORD_LENGTH = 10;

export default function ChangePasswordPage(): JSX.Element {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validationError = useMemo(() => {
    if (newPassword.length > 0 && newPassword.length < MIN_PASSWORD_LENGTH) {
      return `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`;
    }

    if (confirmPassword.length > 0 && confirmPassword !== newPassword) {
      return 'Подтверждение пароля не совпадает';
    }

    return '';
  }, [confirmPassword, newPassword]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setLoading(true);

    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = (await response.json()) as { error?: string; ok?: boolean };

    if (!response.ok || !data.ok) {
      setError(data.error ?? 'Не удалось сменить пароль. Проверьте введённые данные.');
      setLoading(false);
      return;
    }

    router.replace('/stock');
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Смена пароля</CardTitle>
          <CardDescription>Пароль должен быть не короче 10 символов.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Текущий пароль"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
            <Input
              label="Новый пароль"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              autoComplete="new-password"
              helperText="Пароль должен быть не короче 10 символов"
            />
            <Input
              label="Подтвердите новый пароль"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              autoComplete="new-password"
            />
            {error ? <p className="rounded-md border border-critical bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p> : null}
            <Button type="submit" className="w-full" loading={loading}>
              Сохранить пароль
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
