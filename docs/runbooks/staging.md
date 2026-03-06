# Staging runbook

## Контур staging

- Staging-проект Supabase используется как единая БД для Preview/Development и e2e.
- В Vercel для `Preview` и `Development` уже заданы:
  - `DATABASE_URL` (staging runtime/pooler)
  - `SESSION_SECRET`

## Secrets в GitHub Actions

Используются только эти секреты:

- `STAGING_DATABASE_URL` — runtime/pooler URL staging (`:6543`).
- `STAGING_SESSION_SECRET` — session secret для e2e/runtime.
- `STAGING_DIRECT_URL` — direct URL staging для migrate/seed (`:5432`).

## Применение миграций в staging

1. Откройте `Actions` → `Staging Migrate`.
2. Нажмите `Run workflow`.
3. Workflow запускает:
   - `npx prisma migrate deploy`
   - `npm run seed:staging`

## Прогон e2e в staging

1. Откройте `Actions` → `Staging E2E`.
2. Нажмите `Run workflow`.
3. Workflow запускает Playwright без Docker:
   - `npx playwright install --with-deps chromium`
   - `npm run test:e2e:staging`

## Локальный e2e без Docker

```bash
export DATABASE_URL=<STAGING_DATABASE_URL>
export SESSION_SECRET=<STAGING_SESSION_SECRET>
npm run test:e2e:staging
```

Если миграции ещё не применены в staging, сначала запустите workflow `Staging Migrate`, потом `Staging E2E`.
