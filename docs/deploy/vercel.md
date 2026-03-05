# Deploy: Vercel Hobby

## 1) Импорт репозитория
1. Откройте Vercel и нажмите `Add New → Project`.
2. Импортируйте GitHub-репозиторий `ARTSTUDIO_Consumables`.
3. Framework preset: `Next.js`.

## 2) Настроить Node.js 20
- В Vercel: `Project Settings → General → Node.js Version` установите `20.x`.
- В проекте уже задано `engines.node >=20`.

## 3) Добавить environment variables
В `Project Settings → Environment Variables` добавьте:

Обязательные:
- `DATABASE_URL`
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

## 4) Первичная миграция
Важно: **не** выполняйте `prisma migrate deploy` в `build step` Vercel.

Рекомендованный порядок:
1. Локально (или в отдельном CI job) выполнить:
   ```bash
   npm ci
   npm run prisma:generate
   npm run prisma:migrate:deploy
   ```
2. После этого запускать production deploy на Vercel.

## 5) Post-deploy (один раз)
После миграций выполните seeding (не на каждый деплой):
```bash
npm run seed:admin
npm run seed:defaults
```
