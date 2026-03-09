# Canonical compatibility-layer audit map (Шаг 2 / Подшаг 2.1)

## Статус аудита

- **Тип артефакта:** canonical compatibility-layer audit.
- **Место в master-plan:** Шаг 2, подшаг 2.1 (сбор карты compatibility-layer и legacy vocabulary).
- **Назначение артефакта:** это **не** план миграции сам по себе, а обязательная рабочая карта-вход для подшагов 2.2–2.7.
- **Режим интерпретации находок:** каждая находка классифицируется как:
  - допустимый временный **transition layer**;
  - недопустимый **active legacy debt**;
  - скрытый **compatibility residue**;
  - пользовательски видимая **legacy vocabulary issue**;
  - системно опасное расхождение модели.

## Назначение карты compatibility-layer

Карта фиксирует, где именно в repo остаются legacy-термины/структуры и compatibility-швы, какую функцию они выполняют сейчас, насколько они безопасны как временный мост, и в какой подшаг шага 2 их нужно маршрутизировать.

## Методология аудита

Аудит выполнен как cross-layer repo review с обязательным покрытием:

- schema/persistence (Prisma schema + migrations),
- domain/application,
- adapters/API,
- read-side,
- scripts/seed/fixtures/import,
- UI/admin vocabulary,
- tests,
- docs/roadmap/architecture.

Классы legacy-следов, которые различались в аудите:

1. **legacy naming** — старые имена сущностей, полей, enum values, labels, routes, текстов.
2. **compatibility aliases** — допустимые переходные соответствия old→canonical.
3. **semantic drift** — место, где старое имя тянет старую смысловую модель.
4. **hidden legacy dependency** — внешне новый слой, но логика/data backbone остаётся старым.
5. **user-facing vocabulary debt** — legacy-язык, видимый пользователю/админу.
6. **test/fixture legacy** — legacy vocabulary в тестах, seed, fixtures, scripts.

## Канонический словарь отсчёта

Baseline для сравнения взят из канонов и traceability-слоя (включая `docs/roadmap/canon-traceability-map.md`, `docs/roadmap/master-plan.md`, `docs/roadmap/progress-log.md`, `docs/roadmap/codex-prompt-standard.md`):

- **Канонические сущности:** Позиция учёта, Каталог позиций, Движение, Инвентаризационная сессия, Справочники.
- **Канонические оси и аналитика:** Статья затрат, Раздел, доступность осей, controlled parameters.
- **Канонические контуры исполнения:** write-side, read-side, recovery, строка позиции учёта.
- **Канонические продуктовые контуры:** app shell/navigation, роли и доступы.
- **Системные каноны второго круга:** нативная масштабируемость, технический/SLA/устойчивостный канон.

Проверка repo выполняется через вопрос: «является ли данный термин/структура каноническим primary language/primary path или это допустимый локализованный transition bridge?»

## Реестр compatibility-layer и legacy vocabulary

| Legacy term / structure | Канонический эквивалент | Тип проблемы | Где найдено | Текущая роль | Почему это legacy/compatibility | Критичность | Временно оставить? | Следующий подшаг | Признак глубокого устранения |
|---|---|---|---|---|---|---|---|---|---|
| Prisma model `Item` + связанный `item*` vocabulary (`itemId`, `ItemUnit`) | Позиция учёта (`AccountingPosition`) | legacy naming + hidden dependency | `prisma/schema.prisma`, `prisma/migrations/20260228000000_init/migration.sql`, SQL в read-model | **active primary path** persistence | Канон прямо фиксирует `Item` как не-ядро; в repo это всё ещё база хранения и SQL backbone | **high**: модель ядра всё ещё читается через legacy-бекбон | Да, только как локализованный persistence transition layer | 2.2, 2.4 | canonical contracts в domain/API/read-side не требуют `item*` в primary path; legacy остаётся только в адаптерах |
| `Purpose` / `defaultPurposeId` / `purposeId` в schema+service | Каноническая ось `section` (Раздел) | legacy naming + semantic drift | `prisma/schema.prisma`, `src/lib/application/accounting-event/service.ts`, `src/lib/stock/types.ts`, `src/app/api/stock/route.ts` | **active primary path** аналитики | Старое имя несёт старую ось и протекает в API/query параметрах | **high**: риск двойной модели «Раздел в UX / Purpose в данных» | Нет для primary path; да только как alias boundary | 2.2, 2.3 | write/read/API используют canonical `section*`; `purpose*` остаётся только explicit compatibility alias |
| Legacy REST path family `/api/items*` | `/api/accounting-positions*` (или канонический bounded route) | compatibility alias | `src/app/api/items/route.ts`, `src/lib/items/api.ts`, `src/app/api/items/[id]/*` | migration bridge + active integration path | `items` хранит обратную совместимость, но остаётся основным маршрутом | **high**: затрагивает интеграции и контракты | Да, но только как secondary alias с явным deprecation-контуром | 2.3 | canonical route становится primary, `/api/items` — ограниченный alias |
| Dual payload keys `items` + `catalogPositions` | `catalogPositions` как единственный canonical transport key | compatibility alias | `src/app/api/items/route.ts`, `src/lib/domain/position-catalog/types.ts` | transition bridge | Явный dual-shape для совместимости клиентов | **medium**: контролируемо, но тянет legacy клиента | Да, как строго локализованный adapter seam | 2.3 | удалён dual-key из primary API contract; alias закрыт/версионирован |
| Legacy dictionary route codes `expense-articles`, `purposes` | Канонические коды справочников, привязанные к статье затрат/разделу | compatibility alias + naming debt | `src/lib/domain/directories/types.ts`, `src/lib/admin/dictionaries.ts`, `src/app/api/admin/dictionaries/[type]/route.ts` | active admin/API path | Legacy route vocabulary закреплён как параметр API | **medium** | Да, только как adapter-layer | 2.3, 2.5 | канонический registry API primary; legacy route names isolated by mapping gateway |
| SQL/read-model joins against `Item` + columns `defaultPurposeId` | Canonical read-model over accounting-position semantics | hidden legacy dependency | `src/lib/read-models/stock-projection.ts`, `src/lib/stock/calc.ts`, `src/lib/stock/currentQty.ts` | **active primary path** read-side backbone | Внешне UI канонизирован, но проекции считаются по legacy storage names без канонического фасада | **high** | Да, только временно до завершения read-side canonical facade | 2.4 | read-side contract и projection builder опираются на canonical DTO/mapper boundary |
| Import header aliases `Номенклатура`, `Назначение`, `Статья расходов` | `Позиция учёта`, `Раздел`, `Статья затрат` | compatibility alias + test debt | `src/lib/import/xlsx/parse.ts`, `tests/import.xlsx.parse.compatibility.test.ts` | migration bridge (controlled) | Это intentional compatibility для входных Excel | **medium** | Да, при строгой локализации только в parser | 2.6 | aliases ограничены parser boundary, вне parser не протекают в domain/application |
| Import domain types `itemCode`, summary `items`, counter `purposes` | `positionCode`, `positions`, `sections` | legacy naming | `src/lib/import/types.ts`, `src/lib/application/import/contracts.ts`, `src/lib/application/import/service.ts` | active use-case internals | Внутренний vocabulary import-сценария остаётся legacy-first | **high**: импорт закрепляет старую онтологию в операционном контуре | Нет для primary language | 2.6 | import contracts и payload vocabulary canonical-first |
| Seed seeds `purpose`, `defaultPurposeId`, `item` и тестовые коды под legacy ontology | Canonical seed ontology (section/accounting-position semantics) | test/fixture legacy + hidden dependency | `prisma/seed.ts` | bootstrap primary for staging/e2e | Seed создаёт базовые сущности через legacy vocabulary | **high**: seed формирует baseline данных и мышления | Нет как активная основа; только как временный compatibility data bootstrap | 2.6 | seed fixture vocabulary canonical, legacy поля скрыты в adapter layer |
| UI text key `nav.operation` = «Операция» при route `/movements` | Канонический термин «Движения» | user-facing debt + semantic drift | `src/lib/ui-texts/defaults.ts` | user-facing artifact | Текстовый словарь не полностью синхронен с новым shell vocabulary | **high**: прямой UX vocabulary drift | Нет | 2.5 | ключ/тексты и shell labels синхронизированы на canonical movements vocabulary |
| Legacy redirect route `/operation -> /movements` | `/movements` как primary path | compatibility alias | `src/app/(app)/operation/page.tsx`, `tests/e2e/*` URL regex | transition route alias | Нужен для внешних ссылок/старых закладок | **medium** | Да, как явно документированный compatibility redirect | 2.5 | alias route либо deprecate+remove, либо ограничен edge-redirect policy |
| Telegram/service links and app shell start_url anchored on `/stock` | Канонически согласованный app-shell entry semantics | hidden dependency + naming debt | `src/lib/telegram/templates.ts`, `src/app/manifest.ts`, `src/app/page.tsx` | active operational path | Исторический центр навигации «склад-first», не всегда соответствует канону «движения как operational hub» | **medium** | Да временно, но с явной shell policy | 2.5, 2.7 | единый canonical entry strategy зафиксирован в shell+integrations |
| Stock API query/filter `purposeId` and DTO `defaultPurpose` | `sectionId` / `defaultSection` canonical DTO | legacy naming | `src/app/api/stock/route.ts`, `src/lib/stock/types.ts` | active API contract | API наружу несёт legacy field names | **high** | Нет как primary API surface | 2.3, 2.4 | canonical DTO primary; legacy alias only optional/compat mode |
| Accounting-event service compatibility payload duplicate (`compatibility: {expenseArticleId,purposeId}`) | Canonical analytics payload + isolated compatibility envelope | compatibility alias | `src/lib/application/accounting-event/service.ts` | transition bridge | Alias уже локализован, но всё ещё рядом с primary data | **medium** | Да, если envelope ограничен и versioned | 2.2, 2.3 | compatibility envelope вынесен в edge adapter, domain payload canonical-only |
| Documentation still codifies R2.1 compatibility-first as baseline | Step-2 canonical completion baseline | docs drift / hidden policy debt | `docs/architecture/terminology-compatibility-r2.1.md`, `docs/architecture/domain-model.md` | guidance artifact | Документация фиксирует допустимость legacy как норму R2.1, что для 2.2+ уже ограничение | **medium** | Да, но только как historical reference с явным sunset note | 2.7 | docs переключены с compatibility-first на canonical-complete target state |
| `tests/e2e/mobile-nav.spec.ts` URL expectation allows `/operation` | `/movements` canonical-only expectation (или отдельный compat test suite) | test debt | `tests/e2e/mobile-nav.spec.ts`, `tests/e2e/core-flow.spec.ts` | transitional regression guard | Тесты нормализуют старый маршрут как равноправный | **medium** | Да, только если тест явно помечен compatibility coverage | 2.6 | test suite разделяет canonical tests vs compatibility sunset tests |
| UI tooltip key `tooltip.purpose` (даже с текстом «Раздел») | `tooltip.section` | user-facing debt + hidden naming | `src/lib/ui-texts/defaults.ts` | hidden compatibility residue | Смысл канонический, но ключ остаётся legacy | **low/medium** | Да кратковременно, если ключ не протекает наружу | 2.5 | UI text keys и i18n namespace canonical |
| `src/lib/items/*` модуль как active facade для canonical entity | `src/lib/accounting-position/*` facade | structural legacy seam | `src/lib/items/api.ts`, `src/lib/items/types.ts`, validators/use-cases around items | active primary facade | Модульное имя legacy, хотя часть payload уже канонизирована | **high** | Нет как долгосрочный primary facade | 2.2, 2.3 | canonical module naming primary; `items` — thin compat wrapper |

## Глобальные типы legacy-следов

1. **Persistence-layer debt**
   - `Item`, `Purpose`, `defaultPurposeId`, `itemId` как фактический backbone schema/SQL.
2. **Application/API vocabulary debt**
   - `/api/items`, `purposeId`, `defaultPurpose` и `items` payload keys в primary contracts.
3. **Seed/fixture/bootstrap debt**
   - `prisma/seed.ts` и import contracts продолжают реплицировать legacy ontology.
4. **User-facing vocabulary debt**
   - `nav.operation`, часть route expectations (`/operation`) и legacy-key namespace (`tooltip.purpose`).
5. **Admin/control-plane vocabulary debt**
   - admin dictionary route types (`expense-articles`, `purposes`) удерживают legacy route grammar.
6. **Docs drift**
   - R2.1 документы полезны как история, но без sunset-рамки могут закреплять compatibility как норму.
7. **Test drift**
   - e2e/compat tests допускают legacy paths как базовые.
8. **Hidden compatibility mechanisms**
   - dual keys (`items` + `catalogPositions`), compatibility envelopes в write-side payload.

## Карта repo touchpoints

- **Наиболее затронутые слои:** persistence/schema, import pipeline, API contracts, read-model projections, shell/navigation texts, tests.
- **Где compatibility-layer локализован хорошо:**
  - redirect `/operation`;
  - import header aliases (локализованы в parser);
  - `LEGACY_DICTIONARY_TYPE_MAP` как явная карта соответствий.
- **Где compatibility-layer размазан и опасен:**
  - `purpose*` vocabulary сквозь schema → application → stock API → UI;
  - `items` vocabulary сквозь route family, modules, DTO, tests;
  - read-side SQL напрямую на legacy именах без полноценного canonical facade.
- **Где миграционный риск высокий:**
  - API-контракты (`/api/items`, `purposeId`) и интеграции;
  - import/seed, потому что они формируют data ontology;
  - read-side projection code, потому что он влияет на stock/history/reports/signals parity.
- **Где likely primary cleanup в 2.2–2.7:**
  - 2.2/2.3: domain+API vocabulary canonicalization boundaries;
  - 2.4: read-side contracts/projections;
  - 2.5: UI/shell/admin vocabulary;
  - 2.6: tests + seed + fixtures + import internals;
  - 2.7: docs/config/operational trace closure.

## Наиболее критичные разрывы

1. `Purpose/defaultPurposeId` остаётся primary backbone аналитической оси при каноническом языке «Раздел».  
2. `/api/items` + `src/lib/items/*` по-прежнему основной фасад канонической сущности.  
3. Read-side (`stock-projection`) строится напрямую из legacy SQL vocabulary, создавая скрытую dual-model семантику.  
4. Import contracts и сервисы закрепляют `item/purpose` vocabulary как рабочую онтологию (не только alias).  
5. Seed формирует baseline данных через legacy naming, значит миграция канона не воспроизводится «с нуля».  
6. UI text registry держит `nav.operation` при уже каноническом `/movements` — прямой user-facing drift.  
7. Dual transport key (`items` + `catalogPositions`) продлевает неопределённость контракта для клиентов.  
8. E2E ожидания в части URL воспринимают `/operation` как равноправный путь, а не как sunset alias.  
9. Docs R2.1 закрепляют compatibility-first режим без явной «даты выхода» из него.  
10. `tooltip.purpose` и подобные скрытые ключи оставляют неочевидный legacy residue в UI-text namespace.

## Что допустимо как временный transition layer

Допустимо временно:

- compatibility aliases, если они **явно локализованы в одном слое-адаптере**;
- redirect/alias route, если canonical route уже primary и alias не участвует в новой логике;
- parser-level legacy headers для импорта, если outside-parser используются только canonical поля;
- dual response fields только как versioned bridge с зафиксированным sunset-критерием.

Условия безопасного transition-layer:

1. Явная маркировка (`compatibility`, `legacy map`, `alias`).
2. Нет протекания alias в domain core и invariant layer.
3. Есть измеримый критерий удаления и привязка к подшагу 2.x.
4. Тесты разделяют canonical-path и compatibility-path (не смешивают).

## Что недопустимо оставлять в качестве активного primary path

Недопустимо на следующем цикле шага 2:

- использовать `purpose*`/`item*` vocabulary как основной язык новых domain/application/API контрактов;
- оставлять `/api/items` единственным или главным entrypoint канонической сущности;
- поддерживать dual-model без приоритета canonical DTO/fields;
- продолжать seed/import/test baseline в legacy ontology как дефолт;
- оставлять user-facing legacy термины (`Операция`, legacy ключи) в основном shell/UX потоке.

## Приоритеты для подшагов 2.2–2.7

- **Input для 2.2 (domain vocabulary canonicalization):**
  - `Purpose/defaultPurposeId` → section-axis boundary;
  - `items` facade/module naming в domain/application.
- **Input для 2.3 (API/adapters/DTO canonicalization):**
  - `/api/items` family и dual keys;
  - stock/query DTO поля `purposeId/defaultPurpose`;
  - admin dictionary route compatibility governance.
- **Input для 2.4 (read-side/projections):**
  - stock/history/report projections с legacy SQL vocabulary;
  - canonical projection contracts vs legacy payload shape.
- **Input для 2.5 (UI/admin/app-shell vocabulary):**
  - `nav.operation`, `tooltip.purpose`, route alias `/operation`;
  - shell entry semantics (`/stock` vs canonical operational hub policy).
- **Input для 2.6 (seed/tests/fixtures/import scripts):**
  - `prisma/seed.ts` legacy ontology;
  - import contracts naming debt;
  - e2e/tests accepting legacy paths as normal flow.
- **Input для 2.7 (docs/config/trace closure):**
  - R2.1 compatibility docs sunset strategy;
  - doc parity с canonical-complete target;
  - фиксация остаточных aliases как explicitly temporary.

## Критерии завершения подшага 2.1

Подшаг 2.1 может считаться закрытым только если:

1. Собрана полная practically useful карта legacy/compatibility слоя (не только naming, но и structural/semantic).
2. Карта покрывает schema, code, docs, tests, UI/admin, scripts/seed/import.
3. Для каждого значимого legacy-следа определены canonical target и следующий migration substep 2.2–2.7.
4. Явно разделены допустимые transition layers и недопустимый active legacy debt.
5. Документ можно напрямую использовать как migration input для 2.2 и 2.3 без повторного полного аудита.

## Ограничения аудита

- Ограничений доступа к repo не выявлено.
- Build/test запуск не требовался по типу подшага (docs/audit-first), но покрытие слоёв проверено через файловой аудит.


## Update after migration sealing (Шаг 2.7)

- Canonical UI text namespace has been switched to `nav.movements` and `tooltip.section`; legacy keys remain only as bounded alias lookup in UI-text sync boundary.
- Canonical UI/product flow now points to `/movements`; `/operation` remains only as explicit redirect compatibility route for old external links/bookmarks.
- E2E canonical smoke expectations no longer treat `/operation` as a peer primary path.
- Residual compatibility accepted after 2.7:
  - `src/app/(app)/operation/page.tsx` redirect alias (`/operation -> /movements`) as narrow transition boundary.
  - `src/lib/ui-texts/sync.ts` legacy key lookup (`nav.operation`, `tooltip.purpose`) only for canonical key bootstrap/repair.
- Residual compatibility is **not** primary: canonical routes/keys/contracts are default across app shell, admin surfaces, tests, and setup flows.

## Final resealing checkpoint (Шаг 2.11 / 2026-03-09)

### Rechecked former critical hotspots after 2.8–2.10

- **Persistence boundary** (`prisma/schema.prisma`, SQL-level `itemId/defaultPurposeId`) remains legacy by physical storage design and is accepted only as mapped storage boundary.
- **Stock surface** is canonical-primary (`sectionId`, `accountingPositionId`, `defaultSection`) and no longer exposes legacy keys as default outward contract.
- **Catalog edge contracts** were improved with canonical keys, but still run through `/api/items*` primary route family and keep dual response compatibility (`items`, `catalogPositions`, `accountingPositions`).
- **Operation and history surfaces** still contain legacy-primary semantics in critical form/query/contracts (`SINGLE_PURPOSE`, `purposeId`, `defaultPurpose`, `itemId`) beyond narrow compatibility edge mapping.
- **Seed/e2e baseline** moved to canonical setup object for core flow, but broader regression surface still includes legacy-first assumptions around operation/history contracts.

### Residual classification update

1. **Blocking residual (still prevents deep closure of Step 2):**
   - operation UI/domain contracts still primary on `purpose*`/`SINGLE_PURPOSE` state model in row drafts and form flow;
   - history filters/details still primary on `itemId`/`purposeId` payload semantics;
   - `/api/items*` remains primary route family rather than explicit secondary alias path.

2. **Localized and acceptable temporary residue (non-blocking):**
   - physical DB field names (`itemId`, `defaultPurposeId`) localized to persistence mapping boundary;
   - explicit API compatibility aliases where canonical key is primary in request/response contract.

### Final Step-2 closure gate decision

- **Step 2 is NOT yet “Закрыто глубоко”.**
- Reason: at least one remaining **product-surface primary legacy path class** persists (operation/history contract semantics), so closure would be optimistic and non-evidence-based.
- Required next move before Step 3: eliminate/strictly boundary-localize the remaining operation/history legacy-primary contract class and demote `/api/items*` to explicit secondary compatibility route semantics.

## Update after targeted residual sealing (Шаг 2.12 / 2026-03-09)

### Что переклассифицировано

- **Бывший blocking residual operation/history class** переведён в canonical-primary состояние в затронутых primary flows:
  - operation row-state и correction payload больше не построены вокруг `purpose*`/`SINGLE_PURPOSE` как structural primary модели;
  - history consumers перешли на canonical anchors (`accountingPositionId`, `sectionId`) как default usage.
- **Route-primary inversion выполнен:**
  - primary consumers и e2e checks используют `/api/accounting-positions*`;
  - `/api/items*` оставлен как explicit compatibility alias route family.

### Текущий residual state

1. **Eliminated as blocking class:**
   - operation/history dual-primary contract backbone (`item/purpose` as default model language).
2. **Localized acceptable residue (non-blocking):**
   - `/api/items*` compatibility route family c explicit deprecation semantics;
   - storage-level legacy field names (`itemId`, `defaultPurposeId`) на persistence boundary через mapping.

### Closure implication for Step 2

- После 2.12 в карте не остаётся известного **product-surface blocking legacy-primary class**.
- Оставшийся compatibility residue — узкий, явный и не-default; он не должен блокировать deep-closure gate Шага 2.

## 2026-03-09 — Подшаг 2.13 (final contract-route canonicalization pass)

### Что запечатано в этом проходе

- `/api/accounting-positions*` переведён из thin re-export на самостоятельную primary implementation family (`route`, `[id]`, `units`, `movements`, `full`, `toggle-active`).
- `/api/items*` переведён в явный secondary compatibility layer поверх canonical handlers с deprecation headers и explicit compatibility payload mapping.
- В canonical route contracts удалены dual-primary outward payload формы (`items + accountingPositions`, `item + accountingPosition`) и оставлен canonical-only outward truth.
- `src/lib/operation/api.ts` и `src/lib/history/api.ts` закреплены на canonical payload key `accountingPositions` без fallback на legacy `items`.

### Актуальный остаток blocking-класса (ровно один)

1. **Legacy-primary operation/history request semantics в `src/app/api/transactions/route.ts` остаются смешанными (`SINGLE_PURPOSE`/`DISTRIBUTE_PURPOSES`, `headerPurposeId`, `itemId`, `purposeId`) на parse/normalization boundary.**
   - Это больше не route-primary проблема и не dual outward route truth, но всё ещё structural compatibility residue в mutation/filter contracts.
   - Для полного снятия этого блокера нужен отдельный tightly-scoped pass на transaction contract schema + downstream regression pack (operation/history write+read path), чтобы не сломать интеграционные consumer payloads.

### Решение по статусу шага 2 после 2.13

- Статус: **не закрыт глубоко в этом pass**.
- Причина: остаётся **один** локализованный blocker-класс, описанный выше.
- Разблокировка шага 3: **нет**, до устранения этого единственного блокера.
