# Runbook: Staging (pre-prod)

## Назначение

Staging = preview/pre-prod runtime + ручная pre-prod проверка.

Staging **не** используется для destructive E2E reset.

## Runtime env (Vercel Preview)

- `DATABASE_URL` = staging runtime URL
- `SESSION_SECRET`

`APP_URL` и `JOB_SECRET` не обязательны для Preview runtime.

## GitHub Secrets для staging migrate

- `STAGING_DATABASE_URL` — staging runtime/pooler URL
- `STAGING_DIRECT_URL` — staging direct/session URL для Prisma migrate deploy

## Применение миграций

Запустить workflow `Staging Migrate`:

1. `npm ci`
2. `npm run prisma:migrate:deploy`
3. `npm run seed:staging`

## Проверка staging после migrate

- открыть Preview deployment;
- проверить auth/основные экраны;
- при необходимости выполнить ручной smoke по pre-prod сценариям.

## E2E

E2E запускается отдельно в workflow `Staging E2E` на ephemeral PostgreSQL service container в GitHub Actions.
Supabase staging в E2E не участвует.
