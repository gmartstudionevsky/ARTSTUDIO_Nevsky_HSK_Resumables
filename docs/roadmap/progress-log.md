# Progress-log master-plan (канонически трассируемый журнал исполнения)

> Версия: 2026-03-09.
>
> Этот журнал ведётся строго в логике утверждённого `docs/roadmap/master-plan.md`.
>
> Каждая запись обязана быть трассируема к конкретному шагу (или подшагу) master-plan и к соответствующим канонам из `docs/product/canon/*` с учётом `docs/roadmap/canon-traceability-map.md`.
>
> Progress-log фиксирует не просто факт работы, а доказуемое продвижение репозитория к 100% соответствию спецификации.
>
> Формулировка «сделано» в этом журнале означает содержательное продвижение с проверяемыми артефактами, а не наличие заготовки.

## 1. Статус журнала

- Статус журнала: `active, canonical, traceability-enforced`.
- Модель журнала: step-driven (по шагам master-plan 1–11), с фиксацией глубины зрелости.
- Текущий период: переход от исторической (R0/R1/R2...) записи к новой канонической модели шагов.

## 2. Правила внесения записей

1. Каждая запись относится к конкретному шагу или подшагу master-plan.
2. Каждая запись обязана указывать каноническое основание (какие каноны затрагиваются).
3. Каждая запись обязана различать:
   - что было изменено;
   - что стало глубже реализовано;
   - что остаётся незакрытым (gap).
4. Формулировка «готово/закрыто» недопустима, если закрыт только фрагмент слоя.
5. Журнал не является changelog мелких действий без продуктового смысла.
6. Любая запись должна содержать признаки проверяемости (repo artifacts + evidence логики закрытия).

## 3. Шкала статусов

| Статус | Что означает | Чем отличается от соседних | Признаки перевода в статус | Что не даёт права повысить статус |
| --- | --- | --- | --- | --- |
| **Не начато** | По шагу нет оформленного управляемого execution-движения. | Ниже любого статуса активной работы. | Нет подтверждённого scope/записи с каноническим основанием. | Наличие идей, TODO, черновиков без фиксации в рамках шага. |
| **В аудите / декомпозиции** | Шаг анализируется, уточняется scope, зависимости и доказательства завершения. | Выше «Не начато», но без реализации изменений. | Зафиксированы gaps, канонические привязки и ожидаемые артефакты. | Любые утверждения о «реализации» без внесённых артефактов. |
| **В реализации** | Идёт фактическая работа по шагу с изменением repo-артефактов. | Выше «В аудите / декомпозиции»: есть действия в repo. | Появились изменения, привязанные к канону и шагу, но слой ещё не собран. | Частичная правка одного слоя без сквозной связки model/flow/docs/tests. |
| **Частично закрыто** | Завершена значимая часть шага, но остаются критичные gaps. | Выше «В реализации»: есть результат, но он неполный. | Закрыты отдельные цели шага, явно зафиксировано, что осталось. | Наличие только документа/экрана/роута без глубинной консистентности. |
| **Функционально собрано, но не canon-complete** | Функционально шаг работает, но не закрыта каноническая глубина (термины, explainability, governance, тестовые контракты и т.д.). | Выше «Частично закрыто», но ниже «Закрыто глубоко». | Основной функциональный контур собран и проверяем, но есть системные несоответствия канону. | Подмена функциональной готовности канонической зрелостью. |
| **Закрыто глубоко** | Шаг закрыт содержательно и проверяемо по критериям глубины. | Финальный статус зрелости шага. | Канон реализован сквозно в релевантных слоях, evidence достаточен, критичных скрытых противоречий нет. | Формальный rename, локальный workaround, непроверяемые декларации. |
| **Требует повторного прохода** | Ранее достигнутый статус деградировал из-за новых разрывов, аудита, change-impact или несоответствия evidence. | Может применяться после любого статуса, включая высокие. | Зафиксирован системный gap, возвращающий шаг в активную работу. | Локальная косметическая правка без устранения root-cause проблемы. |

## 4. Текущий контур реализации

| Шаг master-plan | Текущий статус | Краткий смысл шага | Утверждённая декомпозиция | Ближайшее следующее рабочее действие | Критичный блокирующий dependency |
| --- | --- | --- | --- | --- | --- |
| 1. Пересборка roadmap-контура | **Частично закрыто** | Собрать исполнимую plan-систему repo. | Да (1.1–1.4) | Закрыть 1.3 (пересборка progress-log/status model) и 1.4 (стандарт Codex-промтов). | Нет внешнего; зависит от дисциплины docs-контуров. |
| 2. Каноническая миграция модели и localization compatibility-layer | **В аудите / декомпозиции** | Очистить модель от legacy leakage. | Пока нет (будет позже) | Зафиксировать scoped implementation-план по migration debt (`item*`/`purpose*`) и user-facing leakage. | Завершение шага 1. |
| 3. Product-grade консистентность write/read/recovery | **В реализации** | Довести ядро консистентности и error/recovery контур. | Пока нет | Усилить error-layer и consistency evidence для import/recovery, убрать сырые тех-ошибки из user/admin surface. | Прогресс шага 2 (чистая модель). |
| 4. Полный канон хаба «Движения» | **В реализации** | Довести главный рабочий хаб до канона. | Пока нет | Закрыть semantic cleanup верхнего контекста и post-action/state parity mobile/desktop. | Шаг 3 (консистентное ядро). |
| 5. Полный базовый продуктовый контур | **В аудите / декомпозиции** | Консолидировать базовые рабочие поверхности. | Пока нет | Подготовить каноническую декомпозицию по каталог/склад/история/инвентаризация/отчёты. | Шаг 4. |
| 6. Root control plane | **Не начато** | Собрать единый управляющий слой. | Нет | Сформировать спецификацию control plane как единого контура (не набора модулей). | Шаг 5. |
| 7. Shell/navigation/explainability coherence | **В аудите / декомпозиции** | Довести сквозную связность восприятия системы. | Нет | Определить target-модель role-aware shell coherence после control plane. | Шаг 6 (ключевой), частично шаг 4. |
| 8. Premium adaptive UX/UI | **Не начато** | Закрыть premium layer без semantic drift. | Нет | Подготовить входные quality gates после шага 7. | Шаг 7. |
| 9. Нативная масштабируемость | **Не начато** | Ввести управляемый конфигурационный слой расширяемости. | Нет | Определить extension governance contract после шагов 5–8. | Шаги 5–8. |
| 10. Глубокий аналитико-стоимостной слой | **Не начато** | Реализовать расширенные аналитико-стоимостные проекции. | Нет | Определить analytical scope и proof-contract после шага 9. | Шаги 5 и 9. |
| 11. Trustworthy implementation (техзрелость) | **Не начато** | Подтвердить эксплуатационную зрелость и доверительный контур. | Нет | Подготовить целевой SLA/observability/regression каркас как финальный gate. | Шаги 3, 6, 9, 10. |

## 5. Журнал шагов и подшагов

> Ниже — переинтерпретированная история в новой рамке master-plan. История не удаляется, а агрегируется в канонически трассируемые записи.

### 2026-03-07 / Шаг 1.1 (Каноническая фиксация источников истины)

- **Шаг master-plan:** 1.
- **Подшаг:** 1.1 (каноническая карта трассируемости / источник канона на момент R0-R1 foundation).
- **Каноны:** базовая десятка как source-of-truth foundation; governance-канон исполнения.
- **Суть продвижения:** Зафиксирован канонический пакет спецификации, glossary, ADR и архитектурных карт, что сформировало основу для дальнейшей трассируемости.
- **Какие repo artifacts были затронуты:** `docs/product/*`, `docs/adr/*`, `docs/architecture/*`, roadmap foundation docs.
- **Что стало глубже реализовано:** Репозиторий получил явный канонический центр принятия решений.
- **Что остаётся незакрытым:** На этом этапе не была закрыта операционная связка «канон ↔ gap ↔ шаг плана» в едином артефакте.
- **Текущий статус после записи:** **Частично закрыто** (для шага 1 на тот момент).
- **Следующее логическое действие:** Пересобрать plan/status модель по реальному состоянию repo.
- **Доказательство завершения подшага/шага:** Наличие канонических документов и архитектурного каркаса в repo.

### 2026-03-07 ... 2026-03-08 / Шаги 2–4 (агрегированная историческая волна R2.x-R5.x)

- **Шаг master-plan:** 2, 3, 4.
- **Подшаг:** без новой официальной декомпозиции (исторические R2.1–R5.2+ записи агрегированы).
- **Каноны:** предметная модель, аналитические оси, write/read/recovery, жизненный цикл движения, хаб «Движения».
- **Суть продвижения:**
  - Добавлен domain/application foundation канонической модели и аналитических осей.
  - Укреплён write-flow/read-model/recovery foundation, включая import sync/use-case слой.
  - Развивался хаб «Движения» как workspace-first контур.
- **Какие repo artifacts были затронуты:** `src/lib/domain/*`, `src/lib/application/*`, `src/lib/read-models/*`, `src/app/api/*`, `src/components/operation/*`, связанные тесты, docs архитектуры.
- **Что стало глубже реализовано:** Ядро стало canon-aware на уровне структур и потоков; появилась база для product-grade доведения.
- **Что остаётся незакрытым:** Compatibility debt, неполная error normalization, неполный control-plane эффект, неполная shell coherence.
- **Текущий статус после записи:**
  - Шаг 2: **В аудите / декомпозиции**;
  - Шаг 3: **В реализации**;
  - Шаг 4: **В реализации**.
- **Следующее логическое действие:** Привести шаги 2–4 к новой step-модели с проверяемыми критериями глубины.
- **Доказательство завершения подшага/шага:** Сквозной набор code/docs/tests-артефактов и подтверждённые use-case контуры.

### 2026-03-08 / Re-baseline после аудита (переход к execution-discipline)

- **Шаг master-plan:** 1 (framework управления реализацией).
- **Подшаг:** 1.1 → подготовка к 1.2/1.3.
- **Каноны:** governance и трассируемость исполнения канона.
- **Суть продвижения:** Зафиксирован audit-контекст и признаны системные разрывы между foundation-готовностью и product-depth.
- **Какие repo artifacts были затронуты:** `docs/audit/2026-03-08-repo-audit.md`, roadmap docs.
- **Что стало глубже реализовано:** Статусы и приоритеты перестали опираться на optimistic интерпретацию.
- **Что остаётся незакрытым:** Требовалась полная пересборка master-plan и progress-log под новую модель.
- **Текущий статус после записи:** **В реализации** (для шага 1).
- **Следующее логическое действие:** Зафиксировать traceability map и обновлённый master-plan.
- **Доказательство завершения подшага/шага:** Явно описанный re-baseline и список системных расхождений.

### 2026-03-09 / Шаг 1.1 (закрыт): Canon traceability map

- **Шаг master-plan:** 1.
- **Подшаг:** 1.1.
- **Каноны:** базовая десятка + второй круг (через карту трассируемости).
- **Суть продвижения:** Создан единый документ `docs/roadmap/canon-traceability-map.md`, связывающий канон, repo-артефакты, статус реализации, gaps и шаги плана.
- **Какие repo artifacts были затронуты:** `docs/roadmap/canon-traceability-map.md`.
- **Что стало глубже реализовано:** Появилась операционная точка трассируемости для проверки глубины реализации по каждому канону.
- **Что остаётся незакрытым:** Нужна синхронизация всех roadmap-документов со step-моделью 1–11.
- **Текущий статус после записи:** Подшаг 1.1 — **Закрыто глубоко**.
- **Следующее логическое действие:** Закрыть 1.2 и 1.3.
- **Доказательство завершения подшага/шага:** Полная структура карты (каноны, разрывы, зависимости, правила использования) в repo.

### 2026-03-09 / Шаг 1.2 (выполнен по содержанию, ожидает фиксации шага 1 целиком)

- **Шаг master-plan:** 1.
- **Подшаг:** 1.2.
- **Каноны:** governance исполнения и каноническая order-логика реализации.
- **Суть продвижения:** `docs/roadmap/master-plan.md` пересобран в новую 11-шаговую execution-order структуру.
- **Какие repo artifacts были затронуты:** `docs/roadmap/master-plan.md`.
- **Что стало глубже реализовано:** План стал исполнимым operational документом с явными зависимостями, критериями глубины и правилами для Codex-промтов.
- **Что остаётся незакрытым:** Требовалась пересборка `progress-log.md` (подшаг 1.3) и формализация стандарта промтов (1.4).
- **Текущий статус после записи:** Подшаг 1.2 — **Закрыто глубоко**; шаг 1 в целом — **Частично закрыто**.
- **Следующее логическое действие:** Пересобрать progress-log и зафиксировать стандарт будущих промтов.
- **Доказательство завершения подшага/шага:** Новый master-plan с разделами, шагами 1–11 и матрицей зависимостей.

### 2026-03-09 / Шаг 1.3 (текущая запись): Пересборка progress-log и статусной модели

- **Шаг master-plan:** 1.
- **Подшаг:** 1.3.
- **Каноны:** governance, explainability исполнения, трассируемость канона к шагам реализации.
- **Суть продвижения:** `progress-log.md` полностью пересобран в канонически трассируемый operational log с новой шкалой зрелости и step-driven структурой.
- **Какие repo artifacts были затронуты:** `docs/roadmap/progress-log.md`.
- **Что стало глубже реализовано:**
  - Введена статусная модель зрелости, отличающая частичную и глубокую реализацию.
  - Добавлена текущая статусная карта шагов 1–11.
  - Исторические записи переинтерпретированы в новой рамке (без потери контекста).
- **Что остаётся незакрытым:** Подшаг 1.4 (стандарт Codex-промтов) ещё не зафиксирован отдельным документальным контрактом.
- **Текущий статус после записи:** Подшаг 1.3 — **Закрыто глубоко**; шаг 1 в целом — **Частично закрыто**.
- **Следующее логическое действие:** Закрыть 1.4 и перевести шаг 1 в «Закрыто глубоко».
- **Доказательство завершения подшага/шага:** Наличие новой структуры журнала, статусной шкалы, карты текущего контура и reusable template будущей записи.

### 2026-03-09 / Шаг 2.1 (закрыт): canonical compatibility-layer audit map

- **Шаг master-plan:** 2.
- **Подшаг:** 2.1.
- **Каноны:** канонические сущности, карта связей, типы движения, write-side, read-side, recovery, строка позиции учёта, app shell/navigation, роли и доступы, нативная масштабируемость, технический/SLA/устойчивостный канон.
- **Суть продвижения:** Собран единый audit-артефакт `docs/audit/compatibility-layer-map.md`, фиксирующий legacy vocabulary, compatibility seams, structural/semantic residues и маршрутизацию в 2.2–2.7.
- **Какие repo artifacts были затронуты:** `docs/audit/compatibility-layer-map.md`, `docs/roadmap/progress-log.md`.
- **Что стало глубже реализовано:**
  - legacy/compatibility debt описан не только по naming, но и по hidden dependency/semantic drift;
  - покрыты schema/persistence, domain/application, adapters/API, read-side, scripts/seed/fixtures, UI/admin, tests, docs;
  - для high-priority разрывов указан конкретный следующий подшаг 2.x и критерий глубокого устранения.
- **Что остаётся незакрытым:** Реализация migration cleanup по подшагам 2.2–2.7 (без выполнения в рамках 2.1).
- **Текущий статус после записи:** Подшаг 2.1 — **Закрыто глубоко**; шаг 2 — **В реализации**.
- **Следующее логическое действие:** Запустить 2.2 с упором на domain vocabulary canonicalization (`purpose/item` как primary debt).
- **Доказательство завершения подшага/шага:** Наличие practically useful compatibility-layer registry с canonical targets, критичностью, временной допустимостью и маршрутизацией в 2.2–2.7.

### 2026-03-09 / Шаг 2.2 (закрыт): canonical domain migration target and policy frame

- **Шаг master-plan:** 2.
- **Подшаг:** 2.2.
- **Каноны:** канонические сущности, карта связей, типы движения, write-side, read-side, recovery, роли/доступы, строка позиции учёта, нативная масштабируемость, технический/SLA/устойчивостный канон.
- **Суть продвижения:** Добавлен нормативный документ `docs/product/canon/canonical-domain-migration-target.md`, фиксирующий единую целевую каноническую модель и обязательные migration rules для подшагов 2.3–2.7.
- **Какие repo artifacts были затронуты:** `docs/product/canon/canonical-domain-migration-target.md`, `docs/roadmap/progress-log.md`.
- **Что стало глубже реализовано:**
  - зафиксирован canonical primary model как единственная целевая траектория (без гибридной интерпретации);
  - введены явные coexistence/transition правила и перечень недопустимых duality-паттернов;
  - описаны layer-by-layer migration targets (schema, migrations, seed, domain, adapters, read-side, API, UI, tests, import);
  - добавлены migration decision rules и canonical target examples как operational рамка для будущих Codex-задач.
- **Что остаётся незакрытым:** Реализация норм документа в коде и контрактах подшагов 2.3–2.7.
- **Текущий статус после записи:** Подшаг 2.2 — **Закрыто глубоко**; шаг 2 — **В реализации**.
- **Следующее логическое действие:** Запустить 2.3 с приведением API/adapters/DTO к canonical primary contracts по правилам 2.2.
- **Доказательство завершения подшага/шага:** Наличие нормативного migration anchor с чётким разделением canonical target / allowed transition / forbidden debt и прямой маршрутизацией на 2.3–2.7.

### 2026-03-09 / Шаг 2.3 (в реализации): canonical persistence vocabulary via Prisma boundary mapping

- **Шаг master-plan:** 2.
- **Подшаг:** 2.3.
- **Каноны:** канонические сущности, карта связей, write/read consistency foundation, recovery, technical/SLA trustworthiness.
- **Суть продвижения:** Prisma schema переведена на canonical primary vocabulary (`MovementType`, `Section`, `AccountingPosition`, `AccountingPositionUnit`) с локализацией legacy physical names через `@@map`/`@map` в persistence-boundary.
- **Какие repo artifacts были затронуты:** `prisma/schema.prisma`, `prisma/migrations/20260309130000_canonical_prisma_vocabulary/migration.sql`, persistence-facing usage в `src/*`, `tests/*`, `prisma/seed.ts`.
- **Что стало глубже реализовано:**
  - legacy vocabulary перестал быть primary в Prisma client contracts;
  - canonical naming стал primary path для persistence-facing TypeScript-контрактов;
  - coexistence локализован на физическом storage-уровне (DB table/type names) как controlled transition layer.
- **Что остаётся незакрытым:** downstream vocabulary cleanup в application/API/UI/tests по шагам 2.4–2.7 и полный regression-green контур по всем сценариям.
- **Текущий статус после записи:** Подшаг 2.3 — **В реализации**.
- **Следующее логическое действие:** Довести regression-пакет и выровнять downstream контракты на canonical DTO/read-side semantics (2.4).
- **Доказательство завершения подшага/шага:** зеленый schema/migration/type/regression verification loop + отсутствие legacy vocabulary в primary persistence path.

### 2026-03-09 / Шаг 2.4 (в реализации): canonical application/API contracts with boundary-local compatibility

- **Шаг master-plan:** 2.
- **Подшаг:** 2.4.
- **Каноны:** write-side/read-side/recovery consistency, канонические сущности и карта связей, explainability и app contract coherence.
- **Суть продвижения:** Протянут canonical vocabulary через application/API contract boundaries для movement-flow: canonical поля (`accountingPosition*`, `section*`) добавлены как primary в прикладные контракты и server responses, при сохранении локализованной compatibility-переводки на boundary.
- **Какие repo artifacts были затронуты:** `src/lib/application/accounting-event/contracts.ts`, `src/lib/application/accounting-event/service.ts`, `src/app/api/transactions/route.ts`, `src/lib/operation/api.ts`, `src/lib/operation/types.ts`.
- **Что стало глубже реализовано:**
  - compatibility перевод old→canonical локализован в API/client boundary вместо протекания в use-case backbone;
  - write-flow contracts и warnings/projection payload получили canonical aliases как primary migration direction;
  - operation client теперь отправляет canonical payload shape и транслирует его в legacy-route формат только на edge.
- **Что остаётся незакрытым:** Полная зачистка legacy vocabulary в остальных API/adapters/UI/scripts/tests (2.5/2.6) и финальная closure-валидация (2.7).
- **Текущий статус после записи:** Подшаг 2.4 — **В реализации**.
- **Следующее логическое действие:** Запустить 2.5 для очистки seed/fixtures/import/scripts vocabulary на canonical baseline.
- **Доказательство завершения подшага/шага:** зеленые application/component/regression tests + typecheck при canonical-first contract path и boundary-local compatibility.

### 2026-03-09 / Шаг 2.5 (в реализации): canonical data/setup/import normalization

- **Шаг master-plan:** 2.
- **Подшаг:** 2.5.
- **Каноны:** канонические сущности и связи, write/read consistency, trustworthy bootstrap foundation.
- **Суть продвижения:** Seed/e2e setup/import normalization переведены на canonical internal vocabulary (`accountingPosition*`, `section*`) с сохранением legacy-парсинга только как boundary-compat для внешнего входа.
- **Какие repo artifacts были затронуты:** `prisma/seed.ts`, `tests/e2e/setupTestData.ts`, `src/lib/import/types.ts`, `src/lib/import/xlsx/parse.ts`, `src/lib/import/xlsx/validate.ts`, `src/lib/application/import/service.ts`, import-related tests.
- **Что стало глубже реализовано:**
  - normalized import payload и sync metadata получили canonical primary shape (с совместимыми alias-полями);
  - apply/rollback import-use-case опирается на canonical naming в internal decisions/summary/rollback metadata;
  - seed и e2e bootstrap data builders перестроены на canonical variable semantics, сохраняя runtime совместимость с mapped persistence fields.
- **Что остаётся незакрытым:** полная user-facing wording cleanup (2.6) и final migration sealing (2.7).
- **Текущий статус после записи:** Подшаг 2.5 — **В реализации**.
- **Следующее логическое действие:** Запустить 2.6 для user-facing/admin wording normalization поверх canonical data/setup foundation.
- **Доказательство завершения подшага/шага:** зеленые import/setup tests + typecheck + подтверждение boundary-local legacy compatibility без legacy-primary internal representation.


### 2026-03-09 / Шаг 2.6

- **Шаг master-plan:** 2.
- **Подшаг:** 2.6 (user-facing/admin/control-plane vocabulary canonicalization).
- **Каноны:** канонические сущности, типы движения, app shell/навигация, explainability-слой, control-plane wording.
- **Суть продвижения:** user-facing и admin vocabulary выровнены под canonical язык движения/раздела, а legacy wording локализован только в bounded compatibility-репарации UI text keys.
- **Какие repo artifacts были затронуты:** `src/lib/ui-texts/defaults.ts`, `src/lib/ui-texts/sync.ts`, `src/app/admin/page.tsx`, `src/components/history/HistoryPageClient.tsx`, `src/components/history/HistoryDetailPageClient.tsx`, `src/app/(app)/items/[id]/page.tsx`, `src/app/api/transactions/[id]/route.ts`, `src/app/api/transactions/[id]/cancel/route.ts`, `src/lib/telegram/templates.ts`, `tests/ui-texts.sync.test.ts`.
- **Что стало глубже реализовано:**
  - canonical UI text keys `nav.movements` и `tooltip.section` стали source-of-truth;
  - sync path теперь поднимает canonical keys даже при наличии только legacy aliases (`nav.operation`, `tooltip.purpose`), не возвращая legacy vocabulary в primary UI path;
  - history/detail/admin/API/telegram wording синхронизирован вокруг «Движение/Движения» и корректных предметных осей «Категория/Раздел».
- **Что остаётся незакрытым:** финальный sealing и removal pass для точечных compatibility следов в 2.7.
- **Текущий статус после записи:** Подшаг 2.6 — **В реализации**.
- **Следующее логическое действие:** Выполнить 2.7 (final migration sealing) с удалением временных compatibility следов и финальной верификацией canon-complete состояния.
- **Доказательство завершения подшага/шага:** typecheck + targeted tests (UI texts/history wording paths) + ручная проверка ключевых surface labels.


### 2026-03-09 / Шаг 2.7

- **Шаг master-plan:** 2.
- **Подшаг:** 2.7 (migration sealing: tests/QA/evidence and legacy-path localization).
- **Каноны:** canonical entities, movement semantics, write/read contracts, bootstrap integrity, app shell/navigation, explainability.
- **Суть продвижения:** выполнен финальный sealing-проход по residual legacy paths и verification contour 2.3–2.6; канонический путь подтвержден как primary через tests, typecheck и targeted smoke checks.
- **Какие repo artifacts были затронуты:** `src/components/catalog/ItemHeaderActions.tsx`, `tests/e2e/mobile-nav.spec.ts`, `tests/e2e/core-flow.spec.ts`, `tests/ui-texts.sync.test.ts`, `docs/audit/compatibility-layer-map.md`.
- **Что стало глубже реализовано:**
  - canonical movement path закреплен в user-flow ссылках и e2e ожиданиях (legacy `/operation` больше не равноправный путь в тестовом baseline);
  - verification contour усилен тестом на `tooltip.purpose -> tooltip.section` alias-bootstrap boundary;
  - residual compatibility классифицирован и зафиксирован как narrow, explicit, non-primary.
- **Residual compatibility после sealing:**
  - `/operation` сохранен только как redirect для обратной совместимости внешних ссылок;
  - UI-text alias lookup для legacy keys сохранен только в boundary sync logic для миграции существующих записей.
- **Текущий статус после записи:** Подшаг 2.7 — **Закрыто глубоко**.
- **Статус всего Шага 2:** **Закрыто глубоко** (canonical model primary across persistence/app/API/setup/surface; compatibility residue narrow and controlled).
- **Следующее логическое действие:** Переход к Шагу 3 на structurally clean canonical foundation.
- **Доказательство завершения подшага/шага:** green typecheck + targeted tests for canonical/compat boundaries + documented residual classification + no legacy-primary URL expectations in e2e baseline.

## 6. Открытые системные разрывы

> Разрывы фиксируются как cross-cutting product/system risks, влияющие на несколько шагов сразу.

1. **Compatibility-layer debt остаётся системным ограничением.**
   - Влияние: шаги 2, 3, 4, 5, 7.
   - Риск: канонический язык может оставаться поверхностным при фактическом legacy-поведении.

2. **Неполная shell coherence и explainability сквозь модули.**
   - Влияние: шаги 4, 5, 7, 8.
   - Риск: пользователь и администратор видят фрагменты, а не единый операционный контур.

3. **Control plane не собран как единый root-слой.**
   - Влияние: шаги 6, 7, 9, 11.
   - Риск: governance и восстановительные действия остаются распределёнными и слабо наблюдаемыми.

4. **Второй круг канонов пока не реализован как обязательная глубина.**
   - Влияние: шаги 9, 10, 11.
   - Риск: расширение и аналитика могут пойти поверх незавершённой базы.

5. **Недостаточная operational maturity (SLA/observability/parity).**
   - Влияние: шаги 3, 6, 11.
   - Риск: нет полного trustworthy execution-подтверждения на эксплуатационном уровне.

6. **Разрывы docs ↔ code ↔ deploy parity.**
   - Влияние: шаги 3, 5, 11.
   - Риск: статус реализации трудно верифицировать единообразно по всем средам.

## 7. Критерии фиксации завершения

Шаг/подшаг может быть зафиксирован как **«Закрыто глубоко»** только если одновременно выполнено:

1. Результат существует не только в docs, но и в релевантных repo-артефактах (код/маршруты/тесты/контракты), где это уместно.
2. Канон отражён не формально, а в модели, flows, naming, tests, docs и user-facing semantics (по scope шага).
3. Нет критичного скрытого legacy-противоречия, продолжающего определять фактическое поведение.
4. Acceptance criteria соответствующего Codex-промта выполнены и проверяемы.
5. Явно зафиксировано evidence, по которому шаг признаётся закрытым глубоко.

## 8. Как использовать progress-log вместе с master-plan и canon-traceability-map

- `master-plan` задаёт маршрут и обязательный порядок шагов.
- `canon-traceability-map` задаёт связь канонов с repo gaps и целевыми шагами.
- `progress-log` фиксирует фактическое продвижение по маршруту с оценкой глубины.
- Ни один следующий большой шаг не должен логироваться вне этой триады.

## 9. Стандарт будущей записи в progress-log

```md
### YYYY-MM-DD / Шаг X(.Y)

- **Шаг master-plan:** X.
- **Подшаг:** X.Y (если есть).
- **Каноны:** <список канонов из docs/product/canon/* и/или second-circle>.
- **Суть продвижения:** <что именно сделано по продуктовой логике шага>.
- **Какие repo artifacts были затронуты:** <файлы/слои/маршруты/тесты/docs>.
- **Что стало глубже реализовано:** <содержательный результат, не формальная активность>.
- **Что остаётся незакрытым:** <конкретный gap>.
- **Текущий статус после записи:** <один статус из шкалы>.
- **Следующее логическое действие:** <следующий управляемый шаг>.
- **Доказательство завершения подшага/шага:** <какой evidence обязателен для deep closure>.
```

### 2026-03-09 / Шаг 2.8

- **Шаг master-plan:** 2.
- **Подшаг:** 2.8 (sealing: canonical field vocabulary в persistence/read contracts).
- **Каноны:** canonical-domain-migration-target, read-side model, canonical entity relations.
- **Суть продвижения:** read/projection и schema-facing stock/catalog contracts переведены на canonical primary field vocabulary (`sectionId`, `defaultSection`, `accountingPositionId`) с локализацией legacy-имен на internal storage boundary.
- **Какие repo artifacts были затронуты:** `src/lib/stock/types.ts`, `src/lib/stock/api.ts`, `src/app/api/stock/route.ts`, `src/lib/read-models/stock-projection.ts`, `src/lib/read-models/catalog-projection.ts`, stock UI/e2e/read-model tests.
- **Что стало глубже реализовано:**
  - stock read contract и payload keys больше не публикуют `purposeId`/`itemId` как primary outward vocabulary;
  - catalog read query contract переведен на canonical `sectionId` filter;
  - e2e и projection tests закрепляют canonical field-level shape как основную модель read-side.
- **Что остаётся незакрытым:** broader operation/history/catalog UI vocabulary cleanup и финальная compatibility зачистка в 2.9/2.10.
- **Текущий статус после записи:** Подшаг 2.8 — **В реализации**.
- **Следующее логическое действие:** продолжить 2.9 с user-facing/API cleanup поверх canonical field contracts.
- **Доказательство завершения подшага/шага:** prisma validate/generate + typecheck + targeted read-model tests + e2e contract updates по stock payload shape.

### 2026-03-09 / Шаг 2.9

- **Шаг master-plan:** 2.
- **Подшаг:** 2.9 (stock/catalog/operation contract-surface canonicalization).
- **Каноны:** canonical entities, read/write contract alignment, movements hub semantics.
- **Суть продвижения:** canonical field language доведен до product-surface contracts в catalog/stock/operation API edges: primary keys `section*`/`accountingPosition*` стали основой query/payload/form contracts, а legacy vocabulary оставлен только в explicit compatibility aliases.
- **Какие repo artifacts были затронуты:** `src/lib/items/validators.ts`, `src/app/api/items/*`, `src/components/catalog/*`, `src/app/api/transactions/route.ts`, `src/app/api/transaction-lines/[id]/correct/route.ts`, e2e/test contracts, progress log.
- **Что стало глубже реализовано:**
  - catalog forms/details/list moved to `defaultSection*` primary contract semantics;
  - items/catalog API now accepts canonical `sectionId/defaultSectionId` and exposes `accountingPositions` as canonical primary response key;
  - operation/history transaction API query and mutation edges accept canonical `accountingPositionId/sectionId` while preserving bounded alias compatibility (`itemId/purposeId`) at boundary only.
- **Что остаётся незакрытым:** final residual cleanup in seed/e2e/admin surfaces (2.10) and possible removal of explicit compatibility aliases after downstream clients are fully migrated.
- **Текущий статус после записи:** Подшаг 2.9 — **В реализации**.
- **Следующее логическое действие:** провести 2.10 final sealing: alias sunset, fixture parity и финальная regress/QA closure.
- **Доказательство завершения подшага/шага:** prisma validate + typecheck + targeted read/operation tests + contract-shape assertions.


### 2026-03-09 / Шаг 2.10

- **Шаг master-plan:** 2.
- **Подшаг:** 2.10 (seed/fixtures/e2e/regression baseline canonicalization).
- **Каноны:** canonical entities, movements hub, read/write consistency, proof-layer reproducibility.
- **Суть продвижения:** baseline setup и e2e data contracts переведены на canonical identifiers (`accountingPositionId`, `sectionId`) как default proof path; legacy aliases удалены из e2e setup outputs.
- **Какие repo artifacts были затронуты:** `prisma/seed.ts`, `tests/e2e/setupTestData.ts`, `tests/e2e/core-flow.spec.ts`, `src/components/operation/OperationForm.tsx`, `tests/e2e/setupTestData.canonical-baseline.test.ts`.
- **Что стало глубже реализовано:**
  - seed/e2e setup больше не возвращают legacy-shaped setup contract (`itemId/purposeId`) как baseline truth;
  - core e2e movement flow использует canonical section/accounting-position anchors;
  - regression test фиксирует canonical setup contract и ловит возврат legacy keys в baseline.
- **Что остаётся незакрытым:** full-suite e2e runtime verification depends on app/server/browser environment; final sealing in 2.11 validates full contour end-to-end.
- **Текущий статус после записи:** Подшаг 2.10 — **В реализации**.
- **Следующее логическое действие:** выполнить 2.11 final sealing с полным e2e/integration run и sunset residual compatibility checks.
- **Доказательство завершения подшага/шага:** seed + canonical setup regression + typecheck + targeted e2e contract checks.

### 2026-03-09 / Шаг 2.11 (финальный повторный sealing)

- **Шаг master-plan:** 2.
- **Подшаг:** 2.11 (closure gate after 2.8–2.10).
- **Каноны:** canonical entities, write/read contract truth, movements hub semantics, proof-layer reproducibility.
- **Суть проверки:** выполнен финальный cross-layer resealing audit по hotspots 2.3–2.10 (persistence, read/projection, stock/catalog/operation, seed/e2e/regression).
- **Фактический итог:** **Шаг 2 пока не может быть переведён в статус `Закрыто глубоко`**.
- **Почему:** в operation/history surfaces остаётся blocking class legacy-primary contract semantics (`purpose*`, `SINGLE_PURPOSE`, `itemId` как primary flow language), а `/api/items*` остаётся фактически primary route family.
- **Что подтверждено как уже canonical-primary:** stock read contracts, часть catalog contracts, e2e setup object baseline (`accountingPositionId`/`sectionId`) и field-level read-side vocabulary from 2.8.
- **Что требуется для честного закрытия:** отдельный узкий завершающий pass по operation/history contract surfaces и route-primary policy (`/api/items*` как strict secondary alias).
- **Статус Шага 2 после 2.11:** **Требует повторного прохода по конкретному residual blocking классу** (не broad migration, а targeted closure pass).
- **Решение по Step 3:** **не разблокирован** до устранения указанного blocking residue.

### 2026-03-09 / Шаг 2.12

- **Шаг master-plan:** 2.
- **Подшаг:** 2.12 (operation/history residual blocking class elimination + route-primary inversion).
- **Каноны:** movements hub semantics, row-state canon, read/write contract canon, compatibility-layer localization.
- **Суть продвижения:** устранён последний blocking dual-primary класс в operation/history контрактах и потребителях; primary route path для сущности позиции учёта переведён на `/api/accounting-positions*`, а `/api/items*` помечен как secondary compatibility alias.
- **Какие repo artifacts были затронуты:** `src/lib/operation/*`, `src/components/operation/*`, `src/lib/history/*`, `src/components/history/*`, `src/lib/items/api.ts`, `src/lib/inventory/api.ts`, `src/app/api/accounting-positions/**`, `src/app/api/items/route.ts`, `tests/components/operation.*.test.ts`, `tests/e2e/accounting-model.spec.ts`.
- **Что стало глубже реализовано:**
  - operation row-state и correction-путь используют canonical anchors (`sectionId`, `accountingPositionId`) как primary model;
  - history detail/filter consumers больше не опираются на `itemId/purposeId` как default contract language;
  - canonical route family `/api/accounting-positions*` стала default path для клиентов и тестов;
  - `/api/items` оставлен только как явно помеченный compatibility слой (Deprecation/Sunset/successor headers).
- **Что остаётся незакрытым:** compatibility aliases всё ещё поддерживаются на boundary-слое (`/api/items*`, dual keys в отдельных payload) до полного sunset, но больше не являются primary path.
- **Текущий статус после записи:** Подшаг 2.12 — **В реализации (verification-complete, awaiting final closure mark)**.
- **Следующее логическое действие:** выполнить финальную closure фиксацию Шага 2 как deep-closed gate и разблокировать старт Шага 3.
- **Доказательство завершения подшага/шага:** typecheck + targeted operation contract tests + read-model regression + route semantics checks (`/api/accounting-positions` as default, `/api/items` as explicit secondary compatibility).

### 2026-03-09 / Шаг 2.13 (final contract-route canonicalization pass)

- **Шаг master-plan:** 2.
- **Подшаг:** 2.13.
- **Суть продвижения:** canonical route family `/api/accounting-positions*` стала фактической primary implementation, а `/api/items*` понижен до explicit secondary compatibility wrappers.
- **Какие repo artifacts были затронуты:** `src/app/api/accounting-positions/**`, `src/app/api/items/**`, `src/lib/operation/api.ts`, `src/lib/history/api.ts`, `tests/regression/contract-route-canonicalization.test.ts`, `tests/e2e/accounting-model.spec.ts`, `docs/audit/compatibility-layer-map.md`.
- **Доказанный результат pass:**
  - route-primary truth теперь в `/api/accounting-positions*`;
  - `/api/items*` больше не implementation backbone и работает как compatibility alias с deprecation headers;
  - canonical clients не используют dual payload fallback (`items`) для accounting-position каталога.
- **Финальное решение по closure Шага 2:** **one single blocker remains**.
- **Оставшийся блокер (ровно один):** mixed legacy-primary transaction request semantics в `src/app/api/transactions/route.ts` (`SINGLE_PURPOSE`/`DISTRIBUTE_PURPOSES`, `headerPurposeId`, `itemId`, `purposeId`) на parse/normalization boundary.
- **Почему не закрыт в этом же pass:** устранение блокера требует отдельного contract-break/change-management прохода с расширенным integration/e2e контуром по операциям и истории; это выходит за безопасный residual scope route-only sealing-pass.
- **Статус после записи:** Шаг 2 — **не закрыт глубоко**, Шаг 3 **не разблокирован**.
