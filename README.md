# ARTSTUDIO Consumables — MVP v1

Система учёта расходных материалов для студии: операции прихода/расхода, текущий склад, история, инвентаризации, отчёты и админ-панель.

## Локальный запуск

```bash
npm install
npm run db:up
npm run prisma:migrate
npm run prisma:seed
cp .env.example .env
npm run dev
```

Если контейнер БД уже поднят, пропустите `db:up`.

## Переменные окружения

### Обязательные

- `DATABASE_URL` — подключение к PostgreSQL.
- `DIRECT_URL` — direct URL для Prisma migrate/seed (если не задан, npm-скрипты используют `DATABASE_URL`).
- `SESSION_SECRET` — секрет подписи сессии.
- `NEXT_PUBLIC_APP_URL` — публичный базовый URL приложения.

### Для digest cron (GitHub Actions)

- `APP_URL` — URL приложения для вызова `/api/jobs/digest`.
- `JOB_SECRET` — секрет для заголовка `x-job-secret`.

### Опциональные

- `TELEGRAM_BOT_TOKEN` — токен бота Telegram.
- `TELEGRAM_DEFAULT_CHAT_ID` — чат по умолчанию для seed defaults.
- `NEXT_PUBLIC_ENABLE_DEBUG` — включение debug-флагов (`true/false`).
- `SEED_ADMIN_PASSWORD` — пароль для разового создания admin.

## Production migrations

- `DATABASE_URL` — только для runtime на Vercel: Supavisor **transaction mode** (`:6543`).
- `DIRECT_URL` — только для production migrations/seed в GitHub Actions: Supavisor **session mode** (`:5432`).

### Как получить обе строки в Supabase

1. Откройте `Supabase → Project Settings → Database → Connection string`.
2. Скопируйте строку **Transaction pooler** (`:6543`) и сохраните как `DATABASE_URL` для Vercel runtime.
3. Скопируйте строку **Session pooler** (`:5432`) и сохраните как `DIRECT_URL` для GitHub Actions migration job.
4. В обе строки подставьте фактический пароль БД и оставьте `sslmode=require`.

### Что настроить в GitHub Secrets

В `GitHub → Settings → Secrets and variables → Actions` задайте:

- `DIRECT_URL` — Supavisor Session mode (`:5432`) для `prisma migrate deploy` и `seed:prod`.
- `SESSION_SECRET` — production session secret.

### Что настроить в Vercel Environment Variables

В `Vercel → Project Settings → Environment Variables` задайте:

- `DATABASE_URL` — Supavisor Transaction mode (`:6543`) для runtime.
- `SESSION_SECRET`
- `NEXT_PUBLIC_APP_URL`
- прочие runtime-переменные проекта (`APP_URL`, `JOB_SECRET` и т.д.).

### Важно

- Не используйте transaction mode (`:6543`) для `prisma migrate deploy`.
- Direct host вида `db.<project-ref>.supabase.co:5432` может быть недоступен из CI без IPv6, поэтому для GitHub Actions используйте Supavisor Session mode (`:5432`).
- Миграции запускайте через workflow `.github/workflows/migrate-prod.yml` (`workflow_dispatch`), затем делайте redeploy/recheck Vercel runtime.

## Production deploy: Vercel + Supabase

Подробные инструкции:

- `docs/deploy/supabase.md`
- `docs/deploy/vercel.md`
- `docs/deploy/cron.md`
- `docs/deploy/checklist.md`

Рекомендуемый порядок релиза:

1. Применить миграции в production БД:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate:deploy
   ```
2. Один раз выполнить seed:
   ```bash
   npm run seed:admin
   npm run seed:defaults
   ```
3. Проверить `/api/health` и `/api/health/extended`.
4. Включить Telegram и digest cron после проверки секретов (`APP_URL`, `JOB_SECRET`).

## Импорт XLSX

1. Перейдите в `Админка → Импорт`.
2. Загрузите файл `.xlsx` в блоке предварительной проверки.
3. Исправьте ошибки по таблице «Проблемы импорта».
4. Подтвердите коммит импорта.
5. Проверьте результат в «Сводке» и «Списке задач».

## Telegram

1. Заполните `TELEGRAM_BOT_TOKEN`.
2. В `Админка → Интеграции → Telegram` добавьте канал.
3. Настройте правила уведомлений по типам операций.
4. Нажмите тестовую отправку дайджеста.

## Политики и закрытие периода

- Политики: `Админка → Настройки`.
  - запрет отрицательных остатков,
  - обязательность причины отмены,
  - точность отображения.
- Закрытие периодов: `Админка → Закрытие периодов`.
  - закрытие/открытие месяца,
  - блокировка изменений в закрытом периоде.


## Staging testing (no Docker)

Используется staging Supabase БД, без `docker-compose`.

```bash
export DATABASE_URL=<STAGING_DATABASE_URL>
export SESSION_SECRET=<STAGING_SESSION_SECRET>
export DIRECT_URL=<STAGING_DIRECT_URL>

npm run test:e2e:staging
```

Важно: пароли внутри URL в secrets должны быть URL-encoded (особенно символы `#` и `?`).

Для подготовки staging БД сначала запустите workflow `Staging Migrate`, затем `Staging E2E`.

### Блок 2 — учётная модель (OPENING + INVENTORY_APPLY)

- Режим `OPENING` при применении инвентаризации создаёт отдельную транзакцию типа `OPENING`.
- Режим `REGULAR` при применении инвентаризации создаёт транзакцию типа `INVENTORY_APPLY` с signed `qtyBase/qtyInput` в строках.
- Для staging e2e используется стабильный логин `e2e_admin / E2EPass12345!` (seed:staging).

## Тесты и CI

```bash
npm run lint
npm run typecheck
npm run build
npx playwright test
```

CI запускает линтер, typecheck, build и e2e smoke/core-flow.

## SLA / DoD MVP v1 (ручной чек-лист)

- [ ] `/operation`: приход → сохранить → отмена/исправление работают, сообщения на русском.
- [ ] `/stock`: корректные остатки, фильтры и поиск работают без рывков.
- [ ] `/history`: фильтры, карточка операции, отмена/исправление работают.
- [ ] `/inventory`: draft → заполнение → ввод факта → частичное применение работают.
- [ ] `/reports/consumption`: группировка и экспорт работают по правам.
- [ ] `/admin/*`: словари, пользователи, импорт, Telegram, настройки, lock-периоды, ui-тексты доступны и стабильны.
