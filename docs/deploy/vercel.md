# Deploy: Vercel Hobby

## 1) Импорт репозитория

1. Откройте Vercel и нажмите `Add New → Project`.
2. Импортируйте GitHub-репозиторий `ARTSTUDIO_Consumables`.
3. Framework preset: `Next.js`.

## 2) Настроить Node.js 20

- В Vercel: `Project Settings → General → Node.js Version` установите `20.x`.
- В проекте задано `engines.node = 20.x`.

## 3) Runtime environment variables в Vercel

В `Project Settings → Environment Variables` добавьте:

Обязательные:

- `DATABASE_URL` — Supavisor Transaction mode (`:6543`) для runtime.
- `SESSION_SECRET`
- `NEXT_PUBLIC_APP_URL`

Для cron digest:

- `APP_URL`
- `JOB_SECRET`

Опциональные:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_DEFAULT_CHAT_ID`
- `NEXT_PUBLIC_ENABLE_DEBUG`
- `SEED_ADMIN_PASSWORD` (только для разового seed admin)

## 4) Production migrations до Vercel deploy

Важно: не запускайте `prisma migrate deploy` в `build step` Vercel.

Порядок:

1. Запустите GitHub Actions workflow `.github/workflows/migrate-prod.yml` (`workflow_dispatch`).
2. Workflow использует `DIRECT_URL` (Supavisor Session mode `:5432`) для `prisma migrate deploy` и `npm run seed:prod`.
3. После успешного workflow сделайте redeploy/recheck Vercel runtime с `DATABASE_URL` (transaction mode `:6543`).

## 5) Предупреждение

- Не используйте transaction mode (`:6543`) для `prisma migrate deploy`.
- Direct host `db.<project-ref>.supabase.co:5432` может быть недоступен без IPv6.
