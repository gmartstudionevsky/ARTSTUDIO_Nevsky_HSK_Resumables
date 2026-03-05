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

- В runtime на Vercel используйте `DATABASE_URL` через Supabase pooler (transaction mode, порт `6543`, параметры `pgbouncer=true&connection_limit=1`).
- Для production-миграций используйте только direct-подключение Supabase (`DIRECT_URL`, хост `db.<project-ref>.supabase.co:5432`, `sslmode=require`).
- Запускайте миграции только через GitHub Action `.github/workflows/migrate-prod.yml` (manual `workflow_dispatch`):
  - action подставляет `DATABASE_URL=${{ secrets.DIRECT_URL }}` и выполняет `npx prisma migrate deploy`;
  - затем выполняет `npm run seed:prod` (без перетирания данных, только idempotent upsert/создание отсутствующих записей).
- Не используйте `prisma migrate dev` в production.

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
