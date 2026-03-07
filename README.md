# ARTSTUDIO Consumables

## Каноническая продуктовая документация

Для продуктового канона и roadmap используйте документы репозитория:

- `docs/roadmap/master-plan.md`
- `docs/roadmap/progress-log.md`
- `docs/product/spec-vnext.md`
- `docs/product/glossary.md`
- `docs/adr/`

## Архитектурный контракт (source of truth)

- Production runtime работает только с **production Supabase DATABASE_URL**.
- Preview runtime работает только с **staging Supabase DATABASE_URL**.
- Staging используется для pre-prod/manual проверки и staging migrations, но **не используется для destructive E2E reset**.
- E2E работает только на локальной/ephemeral PostgreSQL (локально или GitHub Actions service container), **без Supabase**.
- `APP_URL` — канонический production URL: `https://artstudio-consumables.vercel.app` (без trailing slash).
- `JOB_SECRET` нужен только для production digest/job контура.

## Локальный запуск

```bash
npm ci
cp .env.example .env
npm run db:up
npm run prisma:migrate:deploy
npm run seed:defaults
npm run dev
```

## Локальный E2E (deterministic)

```bash
npm run test:e2e:local
```

Что делает команда:

1. `testdb:reset:local-e2e` — безопасный destructive reset только локальной БД (с guard checks).
2. `seed:test:e2e` — детерминированный тестовый пользователь + справочники.
3. `playwright test` — setup-проект логинится реальным auth-механизмом и сохраняет `storageState` в `playwright/.auth/user.json`.

Для локального HTTP e2e используется `E2E_ALLOW_INSECURE_COOKIE=true`, чтобы session cookie корректно работала на `127.0.0.1`.

Тестовый пользователь по умолчанию:

- login: `e2e_admin`
- password: `E2EPass12345!`
- `isActive=true`, `forcePasswordChange=false`, роль `ADMIN`.

## Seed режимы

- `npm run seed:defaults` — только безопасные дефолты (ui_texts/settings/optional telegram channel).
- `npm run seed:staging` — defaults + reference test-like данные для pre-prod проверки (без создания тестовых/админ fallback credentials).
- `npm run seed:test:e2e` — defaults + deterministic e2e user + reference data.
- `npm run seed:bootstrap-admin` — явный одноразовый bootstrap admin; требует `SEED_ADMIN_PASSWORD`, insecure fallback запрещён.

## GitHub Actions

- `migrate-prod.yml`: production `DIRECT_URL` + `prisma migrate deploy` + `seed:defaults`.
- `staging-migrate.yml`: `STAGING_DIRECT_URL`/`STAGING_DATABASE_URL` + `prisma migrate deploy` + `seed:staging`.
- `staging-e2e.yml` и `ci.yml(e2e)`: PostgreSQL service container + `prisma migrate deploy` + `seed:test:e2e` + Playwright.
- `digest.yml`: только `APP_URL` + `JOB_SECRET`, запрос только в production endpoint.

## Verify contract

Полная быстрая проверка качества:

```bash
npm run verify
```

В CI/локально для E2E:

```bash
npm run test:e2e
# или полный локальный цикл с reset
npm run test:e2e:local
```
