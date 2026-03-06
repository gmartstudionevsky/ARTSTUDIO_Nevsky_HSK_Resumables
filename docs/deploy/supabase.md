# Deploy: Supabase environments

## Разделение окружений

В проекте только 2 Supabase проекта:
- Production
- Staging

## Использование

- Production Supabase: production runtime + production migrations.
- Staging Supabase: preview runtime + staging migrations + manual pre-prod checks.
- E2E: никогда не использует Supabase; только ephemeral PostgreSQL в CI.

## Connection strings

- `DATABASE_URL` — runtime connection (Vercel runtime).
- `DIRECT_URL` — migrate connection (GitHub Actions migrate workflows).

Для staging аналогично используются `STAGING_DATABASE_URL` и `STAGING_DIRECT_URL` в GitHub Secrets.

## Миграции

Всегда использовать `prisma migrate deploy`.
`prisma migrate dev` в CI/migrate workflows не использовать.
