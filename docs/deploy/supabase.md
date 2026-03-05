# Deploy: Supabase Postgres (production)

## 1) Создать проект Supabase

1. Откройте [supabase.com](https://supabase.com) и создайте новый проект.
2. Выберите регион ближе к пользователям.
3. Сохраните database password.

## 2) Получить два подключения: runtime и migrations

1. Перейдите в `Project Settings → Database → Connection string`.
2. Скопируйте строку **Transaction pooler** (порт `6543`) — это `DATABASE_URL` для runtime на Vercel.
3. Скопируйте строку **Session pooler** (порт `5432`) — это `DIRECT_URL` для production migrations/seed в GitHub Actions.
4. Подставьте пароль БД, сохраните `sslmode=require`.

Пример runtime (`DATABASE_URL`, Vercel):

```env
DATABASE_URL=postgresql://postgres.<project-ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1
```

Пример migrations (`DIRECT_URL`, GitHub Actions):

```env
DIRECT_URL=postgresql://postgres.<project-ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
```

## 3) Важно для Prisma migrations

- Для `prisma migrate deploy` используйте только `DIRECT_URL` (session mode `:5432`).
- Не используйте transaction mode (`:6543`) для production migrations.
- `db.<project-ref>.supabase.co:5432` может быть недоступен из CI без IPv6 — используйте Supavisor Session mode `:5432`.

## 4) GitHub Secrets

В `GitHub → Settings → Secrets and variables → Actions` добавьте:

- `DIRECT_URL`
- `SESSION_SECRET`

## 5) Vercel Runtime Env

В `Vercel → Project Settings → Environment Variables` добавьте:

- `DATABASE_URL` (transaction mode `:6543`)
- `SESSION_SECRET`
- `NEXT_PUBLIC_APP_URL`
- остальные runtime env по необходимости (`APP_URL`, `JOB_SECRET`, и т.д.)

## 6) Миграции

- Запускать production-миграции вручную через GitHub Actions workflow `migrate-prod` (`workflow_dispatch`).
- После успешного workflow выполнить redeploy/recheck Vercel runtime.
