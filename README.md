# ARTSTUDIO Consumables

## Канонический пакет документации

Главный source of truth проекта находится в репозитории:

- `docs/product/spec-vnext.md`
- `docs/product/glossary.md`
- `docs/product/canon/`
- `docs/roadmap/master-plan.md`
- `docs/roadmap/progress-log.md`
- `docs/audit/2026-03-08-repo-audit.md`

## Текущее состояние проекта

По состоянию на 2026-03-08 проект находится в фазе **re-baseline after audit**:

- ядро домена, write-flow, read-model и recovery foundation уже собраны;
- хаб «Движения» реализован частично и требует продуктовой доводки;
- control plane, premium adaptive UX/UI, отчётность и эксплуатационная зрелость ещё не завершены;
- compatibility-layer и legacy-термины всё ещё присутствуют в части кода, тестов и UI, и должны быть поэтапно устранены.

## Архитектурный контракт

- Production runtime работает только с production Supabase `DATABASE_URL`.
- Preview runtime работает только с staging Supabase `DATABASE_URL`.
- Staging не используется для destructive E2E reset.
- E2E работает только на локальной или ephemeral PostgreSQL, без Supabase.
- `APP_URL` — канонический production URL: `https://artstudio-consumables.vercel.app`.
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

## Локальный E2E

```bash
npm run test:e2e:local
```

## Правило разработки

Любой следующий этап разработки должен:

1. ссылаться на конкретный блок и подэтап из `docs/roadmap/master-plan.md`;
2. соответствовать `docs/product/spec-vnext.md` и `docs/product/canon/*`;
3. обновлять документацию и `docs/roadmap/progress-log.md`;
4. не расширять legacy-слой без плана его устранения.
