# Deploy: Vercel env matrix

## Production (Vercel Production)

Обязательно:
- `DATABASE_URL` (production runtime DB)
- `SESSION_SECRET`
- `APP_URL=https://artstudio-consumables.vercel.app`
- `JOB_SECRET`

Опционально:
- `NEXT_PUBLIC_APP_URL` (если реально используется на клиенте)
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_DEFAULT_CHAT_ID`

## Preview (Vercel Preview)

Обязательно:
- `DATABASE_URL` (staging runtime DB)
- `SESSION_SECRET`

Не должно быть обязательной зависимости preview от:
- `APP_URL`
- `JOB_SECRET`

## Важно

- `APP_URL` хранить без trailing slash.
- Runtime использует `DATABASE_URL`, миграции используют `DIRECT_URL` только в GitHub Actions.
