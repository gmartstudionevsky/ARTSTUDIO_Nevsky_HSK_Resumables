# ARTSTUDIO Consumables

Skeleton monorepo bootstrap for the ARTSTUDIO Consumables web application.

## Stack

- Next.js (App Router) + TypeScript
- TailwindCSS
- Minimal shadcn/ui-compatible base components
- ESLint + Prettier

## Project structure

- `src/app` — routes and API handlers
- `src/components` — reusable UI and layout components
- `src/lib` — constants, env parsing, shared utilities
- `src/styles` — global styles and Tailwind entrypoint
- `public` — static assets and PWA files
- `docs` — documentation area

## Commands

- `npm i`
- `npm run dev`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run format`
- `npm run format:check`

## CI build

- `npm run build` можно запускать без `DATABASE_URL` и `SESSION_SECRET`.
- Для runtime в production обязательны `DATABASE_URL` и `SESSION_SECRET`: защищённые разделы (`/(app)`, `/admin`) завершатся ошибкой при отсутствии env.

## Playwright

1. Установите браузеры и системные зависимости (особенно для CI/контейнера):
   - `npx playwright install --with-deps chromium`
   - Если зависимости уже есть в образе: `npx playwright install chromium`
2. Запустите e2e smoke:
   - `npx playwright test`

Playwright автоматически поднимает приложение через `webServer` в конфиге.

## Health checks

- `GET /health` — health status page
- `GET /api/health` — JSON health endpoint

## PWA

- Manifest: `src/app/manifest.ts`
- Service worker: `public/sw.js`
- Icons: `public/icons/icon-192.svg`, `public/icons/icon-512.svg`, `public/favicon.svg`
- Offline fallback page: `/offline`

Проверка installability:

1. Запустите `npm run dev`.
2. Откройте DevTools → Application → Manifest и убедитесь, что manifest загружен.
3. В Application → Service Workers проверьте, что `sw.js` зарегистрирован.
4. Вкладка Network → Offline, затем откройте `/stock` — должна открыться `/offline`.

## Дизайн-токены и шрифты

- Токены и тема: `src/styles/tokens.css`
- Безопасное подключение локальных шрифтов: `src/styles/fonts.css`
- Инструкция по шрифтам: `docs/fonts.md`
- Папка для локальных файлов: `public/fonts/`

## Database & Prisma (локально)

1. Скопируйте `.env.example` в `.env`.
2. Убедитесь, что `DATABASE_URL` указывает на локальный Postgres из `docker-compose.yml`.
3. Установите зависимости:
   - `npm i`
4. Поднимите БД:
   - `npm run db:up`
5. Создайте и примените миграции:
   - `npm run prisma:migrate`
6. Выполните seed первого администратора (`admin` / `ChangeMe123!`):
   - `npm run seed`
7. Откройте Prisma Studio:
   - `npm run prisma:studio`

Дополнительно:

- Остановить БД: `npm run db:down`
- Полный сброс БД (включая volume): `npm run db:reset`

## Auth flow

1. Неавторизованные пользователи при переходе в разделы приложения (`/stock`, `/catalog`, `/operation`, `/inventory`, `/history`, `/profile`) перенаправляются на `/login`.
2. После успешного логина создаётся сессия в БД и выставляется cookie `asc_session` на 30 дней.
3. Если у пользователя `forcePasswordChange=true`, клиент перенаправляет на `/change-password`.
4. После успешной смены пароля флаг `forcePasswordChange` снимается, и пользователь попадает на `/stock`.
5. Разделы номенклатуры (`/catalog`, `/admin/catalog`) доступны ролям `MANAGER` и `ADMIN`; `SUPERVISOR` перенаправляется на `/stock`, но может читать `/api/items` и `/api/items/[id]/units` для модуля операций.
6. Админ-разделы (`/admin/*`) доступны только пользователям с ролью `ADMIN`, остальные перенаправляются на `/stock`.
7. Выход из профиля вызывает `/api/auth/logout`, сессия помечается как revoked, cookie очищается.

## Как войти admin

1. Выполните `npm run seed`.
2. Откройте `/login`.
3. Введите:
   - login: `admin`
   - password: `ChangeMe123!`
4. После входа выполните обязательную смену пароля на странице `/change-password`.

## Catalog (Номенклатура)

Проверка модуля:

1. Войдите под `admin` или пользователем с ролью `MANAGER`.
2. Откройте `/catalog` и убедитесь, что видны фильтры и кнопка «Добавить позицию».
3. Создайте позицию через мастер и проверьте переход в карточку `/catalog/[id]`.
4. В карточке измените поля, сохраните и проверьте, что изменения применены после перезагрузки.
5. Деактивируйте позицию и убедитесь, что она пропадает из фильтра «Активные» и появляется в «Архив».
6. Для `SUPERVISOR` доступ к `/catalog` должен перенаправлять на `/stock`, а `/api/items` должен возвращать 403.

## Operations v1

Проверка модуля операций:

1. Подготовьте окружение: заполните `.env`, затем выполните `npm i`, `npm run db:up`, `npm run prisma:migrate`, `npm run seed`.
2. В Prisma Studio создайте/проверьте справочники: минимум 1 Category, 1 ExpenseArticle, 1 Purpose, 1 Reason, 1 Unit и 1 Item с ItemUnit (`factorToBase=1`, `isAllowed=true`).
3. Проверьте доступы:
   - `SUPERVISOR` открывает `/operation`.
   - `SUPERVISOR` не открывает `/catalog`.
4. На `/operation` создайте `Приход` в режиме «Одно назначение»: выберите header purpose, добавьте строку и сохраните batch.
5. После сохранения используйте Undo/«Отменить операцию» и проверьте статус `CANCELLED`.
6. Создайте `Приход` в режиме «Распределить»: для строки распределите количество по двум назначениям и сохраните — в результате должны появиться две строки с разными назначениями.
7. Нажмите «Исправить» у строки, измените количество/единицу/назначение и сохраните — исходная строка должна стать `CANCELLED`, новая строка `ACTIVE` с `correctedFromLineId`.
8. Выполните проверки качества: `npm run lint`, `npm run typecheck`, `npm run build`.

## Stock v1

Проверка модуля склада:

1. Подготовьте окружение: заполните `.env`, затем выполните `npm i`, `npm run db:up`, `npm run prisma:migrate`, `npm run seed`.
2. Создайте справочники и позицию через `/admin/dictionaries` и `/catalog`.
3. Создайте операции в `/operation`: приход 10, расход 3, коррекция +2 (или -1), затем отмените одну строку.
4. Откройте `/stock` и проверьте live-остаток (например, `10 - 3 + 2 = 9`), отменённая строка не должна влиять.
5. Проверьте фильтры статуса на `/stock`: «Нулевые», «Ниже минимума», «ОК».
6. Откройте карточку `/items/[id]` и проверьте остаток, статус и блок «Последние движения».
7. Проверьте права: `SUPERVISOR` имеет доступ к `/stock` и `/items/[id]`, но `/catalog` по-прежнему недоступен.
8. Выполните проверки качества: `npm run lint`, `npm run typecheck`, `npm run build`.

## History v1

Проверка модуля истории:

1. Подготовьте окружение: заполните `.env`, затем выполните `npm i`, `npm run db:up`, `npm run prisma:migrate`, `npm run seed`.
2. Создайте справочники и 1–2 позиции через `/admin/dictionaries` и `/catalog`, затем заведите 3–5 batch-операций в `/operation`.
3. Откройте `/history` и проверьте список batch-операций, фильтры периода/типа/статуса и поиск по batch/item/login.
4. Откройте любую операцию в `/history/[id]`, проверьте строки и блок «Сводка».
5. Выполните «Отменить строку» и убедитесь, что строка стала `CANCELLED` и детали обновились.
6. Выполните «Исправить» для активной строки: исходная должна стать `CANCELLED`, а новая строка появится в новом batch (и в истории).
7. Выполните «Отменить операцию» для batch: все активные строки должны стать `CANCELLED`, статус batch — `CANCELLED`.
8. Проверьте отражение изменений в `/stock` и выполните проверки качества: `npm run lint`, `npm run typecheck`, `npm run build`.

## Inventory v1

Проверка модуля инвентаризации:

1. Подготовьте окружение: `.env`, затем `npm i`, `npm run db:up`, `npm run prisma:migrate`, `npm run seed`.
2. Создайте справочники, позиции и несколько операций прихода/расхода, чтобы получить ненулевые остатки.
3. Откройте `/inventory`, создайте обычную инвентаризацию и перейдите в детали.
4. Нажмите «Сформировать список позиций» → «Все активные», введите факт для нескольких строк, отметьте `Применить` только на части строк.
5. Под `MANAGER`/`ADMIN` нажмите «Применить выбранное»: должны создаться batch `IN`/`OUT` с note по id инвентаризации, сессия станет `APPLIED`.
6. Откройте `/stock` и проверьте, что остатки изменились автоматически.
7. Создайте инвентаризацию в режиме «Открытие склада 01.03.2026», заполните факт и примените: должен создаться только `IN` batch с note «Открытие склада 01.03.2026».
8. Проверьте права: `SUPERVISOR` может создавать, заполнять и редактировать факт, но `POST /api/inventory/[id]/apply` возвращает `403`.
9. Выполните проверки качества: `npm run lint`, `npm run typecheck`, `npm run build`.

## Reports v1

Проверка отчёта расхода по статьям/назначениям:

1. Подготовьте окружение: `.env`, затем `npm i`, `npm run db:up`, `npm run prisma:migrate`, `npm run seed`.
2. Создайте в справочниках минимум 2 статьи расходов и 2 назначения, затем 1–2 позиции в `/catalog`.
3. Проведите несколько операций `OUT` в `/operation` с разными статьями/назначениями (при необходимости с override на строках).
4. Откройте `/reports/consumption`, выберите период и проверьте группировку по статьям и по назначениям.
5. Убедитесь, что количество в отчёте отображается в единице отчётности позиции.
6. Под `MANAGER`/`ADMIN` проверьте экспорт CSV/XLSX; под `SUPERVISOR` кнопки экспорта отсутствуют, а `GET /api/reports/consumption/export` возвращает `403`.
7. Выполните проверки качества: `npm run lint`, `npm run typecheck`, `npm run build`.

## Telegram

Поддерживается интеграция с Telegram-каналами для уведомлений об операциях и ежедневного дайджеста склада.

### Переменные окружения

- `APP_URL` — базовый URL приложения для deep links в сообщениях.
- `TELEGRAM_BOT_TOKEN` — токен Telegram-бота (только env, не хранится в БД).
- `JOB_SECRET` — секрет для защищённого job endpoint `/api/jobs/digest`.
- `TELEGRAM_DEFAULT_CHAT_ID` *(опционально)* — если задан, seed создаёт канал «Основной».

### GitHub Actions cron

Файл `.github/workflows/digest.yml` запускает ежедневный вызов `/api/jobs/digest` в `06:00 UTC`.

Требуемые GitHub Secrets:

- `APP_URL` — production URL (например `https://example.com`).
- `JOB_SECRET` — секрет, совпадающий со значением `JOB_SECRET` в окружении приложения.

## UI Texts

Управляемые UI-тексты хранятся в таблице `UiText` и редактируются в админке `/admin/ui-texts`.

- Публичный API для авторизованных пользователей (`SUPERVISOR+`): `GET /api/ui-texts?q=&limit=&offset=`.
- Админ API (`ADMIN`):
  - `GET /api/admin/ui-texts?q=&scope=all|BOTH|WEB|MOBILE&limit=&offset=`
  - `POST /api/admin/ui-texts` с телом `{ key, ruText, scope }`
  - `PATCH /api/admin/ui-texts/[id]` с телом `{ ruText?, scope? }`
- Ключ `key` неизменяемый после создания; удаление UI-текстов не предусмотрено.
- Клиентский `UiTextProvider` загружается в layout и отдаёт тексты через `useUiText(key, fallback)`.
- Логика выбора по `scope`:
  - mobile (< `md`): `MOBILE` → `BOTH` → fallback
  - desktop/web (>= `md`): `WEB` → `BOTH` → fallback
- После сохранения в `/admin/ui-texts` вызывается `refresh()` провайдера, поэтому подписи меню и подсказки обновляются без ручного refresh страницы.
- `npm run seed` добавляет базовые ключи `nav.*`, `nav.admin.*`, `tooltip.*`, но не перезаписывает уже существующие значения.
