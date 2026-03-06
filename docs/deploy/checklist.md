# Release checklist

- [ ] Production migrate workflow выполнен (`migrate-prod.yml`).
- [ ] В production migrate используются только `DIRECT_URL` + `prisma migrate deploy`.
- [ ] В production не выполняется скрытый seed admin с fallback-паролем.
- [ ] При необходимости bootstrap admin выполнялся явно через `seed:bootstrap-admin` и `SEED_ADMIN_PASSWORD`.
- [ ] Vercel Production использует production `DATABASE_URL`.
- [ ] Vercel Preview использует staging `DATABASE_URL`.
- [ ] Staging не используется для destructive E2E reset.
- [ ] E2E workflow использует PostgreSQL service container.
- [ ] Digest workflow использует только `APP_URL` + `JOB_SECRET` и бьёт в production endpoint.
- [ ] `APP_URL` задан без trailing slash.
