# Deploy: Supabase Postgres (production)

## 1) Создать проект Supabase
1. Откройте [supabase.com](https://supabase.com) и создайте новый проект (Free plan).
2. Выберите регион ближе к вашим пользователям.
3. Сохраните database password (понадобится для connection string).

## 2) Получить `DATABASE_URL`
1. Перейдите в `Project Settings → Database`.
2. Найдите блок `Connection string` и выберите URI-формат.
3. Скопируйте строку и подставьте реальный пароль БД.
4. Используйте её как `DATABASE_URL` в production env (Vercel).

Пример:
```env
DATABASE_URL=postgresql://postgres:<PASSWORD>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require
```

## 2.1) URL для GitHub Actions (миграции через pooler)
Для GitHub Actions (особенно на Supabase Free) используйте отдельный секрет `MIGRATE_DATABASE_URL` с Transaction Pooler (IPv4):

```env
MIGRATE_DATABASE_URL=postgresql://postgres.<project-ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1
```

- Порт `6543` — pooler (IPv4), обычно доступен из GitHub Actions.
- Порт `5432` (direct/session) на Free тарифе часто недоступен из GitHub-hosted runners.

## 3) Схемы и права
- По умолчанию Prisma работает со схемой `public`.
- Для MVP достаточно сервисного подключения `postgres` из Supabase project.
- Не публикуйте `DATABASE_URL` и не передавайте его на клиент.

## 4) SSL
- Для Supabase Postgres используйте SSL (`sslmode=require`) в `DATABASE_URL`.

## 5) Миграции
- Production-миграции применять отдельной командой:
```bash
npm run prisma:migrate:deploy
```
- Не запускайте `prisma migrate dev` в production.
- Миграции запускайте вручную перед релизом или отдельным CI job.
