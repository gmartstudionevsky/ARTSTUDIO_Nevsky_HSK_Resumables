# Canonical domain migration target (Шаг 2 / Подшаг 2.2)

## Статус документа

- **Тип документа:** нормативный документ целевого состояния предметной модели ARTSTUDIO Consumables.
- **Место в master-plan:** Шаг 2, подшаг 2.2.
- **Статус применения:** обязательный для всех изменений в подшагах 2.3–2.7.
- **Ограничение текущего подшага:** документ **не выполняет миграцию**, а задаёт обязательную рамку миграционных решений.
- **Правило валидации:** любая дальнейшая миграция модели в repo оценивается относительно этого документа, `docs/audit/compatibility-layer-map.md`, и canonical docs.

## Назначение документа

Этот документ фиксирует единую целевую каноническую предметную модель и правила миграции к ней, чтобы:

1. исключить расхождение migration-векторов между persistence/application/API/UI/tests;
2. исключить «гибрид forever» между legacy и canonical vocabulary;
3. зафиксировать строгие правила coexistence как временного transition layer;
4. сделать подшаги 2.3–2.7 исполнимыми без повторного переопределения целевой модели.

## Канонический целевой принцип миграции

1. Repo должен прийти к **одной** предметной модели (canonical primary model), а не к гибриду старой и новой.
2. Целевая модель определяется уже утверждёнными canonical docs (`docs/product/canon/*`) и трассировкой (`docs/roadmap/canon-traceability-map.md`).
3. Migration target — это структурное выравнивание модели во всех слоях, а не косметический rename UI-терминов.
4. Coexistence старого и нового допустим только как локализованный transition layer с явной границей и сроком удаления.
5. Primary path (schema/domain/application/API/read-side/UI/tests) должен стать каноническим; legacy path не может оставаться backbone.

## Целевая предметная модель

### 1) Primary сущности (обязательный backbone)

- **Позиция учёта (AccountingPosition)** — primary domain entity учётного пространства.
- **Движение (AccountingEvent/Movement)** — primary факт изменения учёта.
- **Инвентаризационная сессия (InventorySession + apply semantics)** — отдельный primary контур для фиксации/применения факта.
- **Базовые аналитические оси** (Раздел, Статья затрат, единицы, пространственные и lifecycle-атрибуты) — обязательная часть модели факта.

### 2) Производные и контекстные сущности

- **Read-model проекции** (склад, история, отчёты, сигналы) — производные представления, не источник истины.
- **Каталог позиций** — read-side реестр Позиции учёта (производная операционная форма).
- **Control-plane сущности** (policy/settings/roles visibility) — управляющий контур, не подмена domain-ядра.
- **Import/sync/bootstrap сущности** — технические контуры ввода/согласования, не отдельная предметная истина.

### 3) Naming-centers, которые обязаны стать основой vocabulary

- `accounting-position` / «Позиция учёта»;
- `movement` / «Движение»;
- `section` / «Раздел»;
- `expense-article` / «Статья затрат»;
- `inventory session/apply/opening`;
- `read-model/projection/recovery/control-plane`.

### 4) Что больше не может быть backbone

- `Item` как primary пользовательская/доменная сущность;
- `Purpose`/`defaultPurposeId` как primary имя канонической оси «Раздел»;
- «Операция» как primary язык хаба движений;
- seed/tests/import vocabulary, закрепляющий legacy ontology как default reality.

### 5) Legacy-only элементы (допустимы только как временная совместимость)

- `Item`, `item*`, `/api/items*`;
- `Purpose`, `purpose*`, `defaultPurposeId`, `purposeId`;
- legacy aliases импорта: «Номенклатура», «Назначение», «Статья расходов»;
- dual transport keys (`items` рядом с canonical ключом).

## Канонический словарь сущностей и терминов

| Каноническое имя | Краткий смысл | Допустимые слои применения | Недопустимые legacy-эквиваленты как primary | Допустимые временные aliases | Признак обязательного удаления alias |
|---|---|---|---|---|---|
| Позиция учёта / `AccountingPosition` | Базовая учитываемая сущность | domain, application, API DTO, read-model contracts, UI тексты, tests | `Item` как primary domain label | `Item` только в persistence/adapters | alias используется вне adapter boundary |
| Каталог позиций / `PositionCatalog` | read-side реестр позиций | read-side, API read DTO, UI каталог | «Номенклатура» | transport alias `items` при миграции клиента | клиенты принимают только canonical key |
| Движение / `Movement` | Канонический факт изменения | write-side, read-side, recovery, UI hub | «Операция» как primary термин события | `/operation` redirect alias | alias остаётся в навигации/новых контрактах |
| Тип движения / `MovementType` | Класс факта (`IN/OUT/ADJUST/OPENING/INVENTORY_APPLY`) | schema enums, domain, write/read contracts, tests | произвольные «операции» без типа | нет, кроме strict map legacy→movementType | mapping размыт и не локализован |
| Сторона движения / `movement side` | Направление факта (приход/расход/коррекция) | domain rules, form semantics, tests | смешение со статусом документа | limited UI alias для исторических экранов | сторона не трассируется в write/read parity |
| Локация / `Location` (пространственная ось) | Пространственный контекст учета | domain axes, write/read, reports | подмена локации аналитикой/комментарием | нет системного legacy alias по умолчанию | пространственная ось не моделируется явно |
| Раздел / `section` | Рабочая аналитическая ось | schema/domain/API/read-side/UI/tests | `Purpose` как primary термин | `purpose*` только в compatibility adapter | `purpose*` течёт в primary contracts |
| Статья затрат / `expenseArticle` | Финансово-учётная аналитика | schema/domain/API/read-side/reports | «Статья расходов» как primary vocabulary | import parser header alias | alias выходит за parser boundary |
| Единицы измерения / `units` | Базовые, входные, отчетные единицы и коэффициенты | schema/domain/import/UI/tests | неструктурные «ед.» без ролевой модели | допустимы пользовательские сокращения в UI | сокращение становится field-name contract |
| Инвентаризационный контур | Контур фиксации/применения результата | write-side/read-side/recovery/tests | подмена обычным movement без inventory semantics | legacy workflow alias только в UI подсказках | режим неотличим от обычного движения |
| Импортный контур | Контролируемый ввод и sync с canonical model | import parsers, application import use-case, admin UI, tests | import payload как независимая истина | parser-level header aliases | aliases определяют доменную модель после parser |
| `origin / mode / lifecycle` vocabulary | Источник, режим, стадия факта | write-side, recovery, audit/explainability | размытые поля без lifecycle semantics | versioned compatibility fields в edge DTO | lifecycle информация не проверяется инвариантами |
| Control-plane vocabulary | Политики, роли, рамки допустимости | admin/control plane, guards, docs, tests | role flags как суррогат доменной модели | нет, кроме backward-compatible permission mapping | policy/roles конфликтуют с canonical boundaries |

## Канонические поля и допустимые naming patterns

### 1) Domain naming

- Должны использоваться canonical центры: `accountingPosition`, `section`, `expenseArticle`, `movement`, `inventorySession`, `projection`, `recovery`.
- Недопустимо вводить новые domain-first имена `item*`/`purpose*` для канонических сущностей.
- Legacy-smell: domain объекты с canonical UI label, но legacy field centers внутри (semantic drift).

### 2) Persistence naming

- До завершения миграции допустимы legacy технические имена таблиц/полей, если они изолированы mapper/adapters слоем.
- Недопустимо расширять legacy naming в новых миграциях как primary vocabulary.
- Техническое имя допустимо, если: (a) не user-facing, (b) есть canonical mapping, (c) не протекает в application contracts.

### 3) DTO / adapter naming

- Primary DTO names — canonical.
- Legacy поля допускаются только как explicit compatibility envelope/alias, versioned и локализованные в adapter boundary.
- Недопустимо duality без явного primary canonical field (например, равноправные `purposeId` и `sectionId` forever).

### 4) User-facing naming

- UI, admin, тексты, формы и help должны быть canonical-first.
- Legacy термин допустим только как пометка «историческое/для совместимости» и не в primary workflow.

### 5) Test / fixture naming

- Canonical naming обязателен в новых тестах/фикстурах/seed.
- Legacy naming допустим только в explicit compatibility-tests с пометкой цели и sunset-критерием.

### 6) Patterns, которые больше не должны появляться

- новые маршруты/DTO/контракты с `item*`/`purpose*` как primary model vocabulary;
- user-facing тексты, где canonical label заменён legacy формулировкой;
- фикстуры, где legacy ontology считается default семантикой;
- неявные aliases без маркировки compatibility.

## Канонические связи и границы сущностей

1. **Позиция учёта** — самостоятельная сущность; не производная от каталога/импорта/склада.
2. **Движение** — самостоятельный факт; read-side его отражает, но не определяет.
3. **Инвентаризационная сессия** — самостоятельный контур со своей lifecycle-семантикой.
4. **Справочники** — классификационные сущности; они не подменяют ядро факта.
5. **Read-model связи** — только derived relations; они не создают альтернативную правду.
6. **Control-plane** — управляет правилами, но не должен переносить доменную правду в настройки.

Где legacy чаще подменяет границы (и почему это недопустимо):

- `Purpose` как суррогат канонического `section`: ломает семантику осей.
- `Item` как универсальная сущность для domain+API+UI: стирает границу между storage legacy и canonical domain.
- Import/seed как «вторая правда»: закрепляет ontology вне канонического ядра.

Дубли и псевдосущности, не подлежащие миграции в новую модель:

- параллельные primary-слои `item` и `accountingPosition`;
- параллельные primary-оси `purpose` и `section`;
- параллельные primary-роуты без явной canonical доминанты.

## Правила coexistence и transition layer

Coexistence старого и нового vocabulary допустим только при одновременном выполнении всех правил:

1. **Локализация:** coexistence ограничен adapter/parser/redirect boundary; не сквозной по repo.
2. **Явная маркировка:** `legacy`, `compatibility`, `alias` помечены в коде/контрактах/доках.
3. **Primary canonical path:** canonical vocabulary — единственный primary путь выполнения.
4. **Ограниченность:** transition-layer не расширяется новыми legacy use-cases.
5. **Проверяемость:** есть критерий удаления alias и привязка к подшагу 2.x.
6. **Трассируемость:** coexistence отражён в тестах как compatibility coverage, а не как равноправный нормальный поток.

Где coexistence ещё допустим:

- parser-level импортные header aliases;
- edge API alias-ответы для старых клиентов;
- route redirects для исторических ссылок;
- persistence technical naming при наличии canonical facade.

## Недопустимые формы coexistence

1. Schema «почти canonical», но application/domain всё ещё legacy-primary.
2. UI канонический, а adapters/DTO/tests/seed продолжают legacy backbone.
3. Docs canonical, а import/fixtures/scripts закрепляют старую ontology.
4. Legacy aliases размазаны по нескольким слоям, а не локализованы.
5. Coexistence без explicit owner, sunset-критерия и проверяемого плана удаления.
6. Legacy alias используется как default path для новых сценариев.
7. Duality в core contracts без canonical single source of truth.

## Правила миграции по слоям repo

| Слой | Канонический migration target | Допустимый временный transition state | Недопустимое формальное обновление |
|---|---|---|---|
| persistence/schema | Schema поддерживает canonical semantics, legacy storage names изолированы mapping-слоем | временное сосуществование legacy names при canonical facade | добавлять новые legacy-first поля/enum/relations как primary vocabulary |
| migrations | Миграции двигают модель к canonical центрам и сокращают legacy backbone | промежуточные bridging-колонки/маппинги с явной целью удаления | миграции, закрепляющие dual-model indefinitely |
| seed/fixtures | Seed/fixtures воспроизводят canonical ontology по умолчанию | legacy data aliases только для compat-наборов | «канонический UI при legacy seed реальности» |
| application/domain | use-cases и invariants canonical-first | compatibility mapping на входе/выходе edge adapters | business logic на legacy entity-language |
| adapters/DTO/mappers | canonical DTO как primary, legacy aliases в compat envelopes | dual-fields только versioned и локально | равноправные legacy/canonical поля без приоритета |
| read-side/projections | проекции читают canonical contracts и подтверждают write/read parity | временный SQL legacy backend под canonical projection interface | read-side vocabulary расходится с canonical write vocabulary |
| routes/API | canonical routes/params/fields primary | legacy routes/fields только alias/redirect | новые API на legacy naming centers |
| UI/admin texts | user-facing vocabulary canonical | исторические подписи только как вторичные hints | canonical docs + legacy primary wording в UI |
| tests | tests подтверждают canonical primary path и coexistence-границы | отдельный compatibility-test слой на период sunset | тесты принимают legacy как равноправную норму |
| import/sync/bootstrap | import нормализуется в canonical model до domain слоя | parser aliases + sync bridge с локализацией | import payload vocabulary определяет primary domain semantics |

## Принципы удаления legacy-path

1. Legacy-path должен быть вытеснен из роли primary path.
2. Compatibility-layer должен сокращаться и локализоваться, а не расширяться.
3. Конечная цель — canonical primary model, а не perpetual coexistence.
4. Удалить legacy-path = убрать его фактическую определяющую роль в schema/domain/application/API/read-side/tests/seed.
5. Скрытие legacy в UI без выравнивания внутренних слоёв не считается удалением legacy-path.

## Критерии завершения канонической миграции модели

Шаг 2 не может считаться «закрыто глубоко», пока одновременно не выполнено:

1. Canonical vocabulary стал primary в schema/domain/application/API/UI/tests.
2. Legacy-path перестал быть backbone фактического выполнения.
3. Seed/fixtures/scripts/import подтверждают canonical модель как default reality.
4. Coexistence локализован, объясним и ограничен измеримыми transition-границами.
5. User-facing и internal vocabulary больше не противоречат друг другу.
6. Write/read/recovery и role/control semantics подтверждают единую модель без скрытой duality.

## Роль документа в подшагах 2.3–2.7

- **2.3 (API/adapters/contracts):** использовать словарь, naming rules и coexistence constraints как норму проектирования DTO/маршрутов/alias boundaries.
- **2.4 (read-side/projections):** использовать канонические границы сущностей и критерии derived-relations для выравнивания проекций с write-side.
- **2.5 (UI/admin vocabulary):** использовать user-facing naming policy и forbidden coexistence patterns для очистки shell/forms/texts.
- **2.6 (tests/seed/import/fixtures):** использовать layer rules и legacy-path removal principles для закрепления canonical default reality в non-prod контурах.
- **2.7 (closure/verification):** использовать completion criteria и decision rules как формальную done-definition глубины миграции.

## Migration decision rules

1. Если legacy термин содержит semantic drift, его нельзя оставлять как alias без явной локализации boundary.
2. Если устранение legacy требует изменения нескольких слоёв, локальный rename в одном слое не считается завершением.
3. Если UI уже канонический, а data/application/tests остаются legacy-primary, задача считается незавершённой.
4. Если primary path остаётся legacy, миграция не считается состоявшейся.
5. Если compatibility alias начинает использоваться в новых фичах, это нарушение migration policy.
6. Если coexistence нельзя объяснить одной локальной границей и sunset-критерием, это structural debt.
7. Если canonical и legacy контракты одновременно считаются «равно primary», решение отклоняется.

## Canonical target examples

1. **`Item` → `AccountingPosition` как primary backbone:**
   - корректно: legacy `Item` остаётся только storage alias, а domain/API/read contracts canonical-first;
   - некорректно: новый use-case строится вокруг `item*` vocabulary как основной модели.

2. **`Purpose` alias только в adapter-boundary:**
   - корректно: входной `purposeId` маппится на canonical `sectionId` в edge adapter;
   - некорректно: `purposeId` проходит через application и read-model как primary field.

3. **User-facing канонизация без выравнивания seed/tests — не done:**
   - корректно: UI, seed, fixtures и tests используют одну canonical ontology;
   - некорректно: UI показывает «Раздел», но seed/tests продолжают жить в `purpose`-backbone.

4. **Compatibility route как локальный transition seam:**
   - корректно: `/operation` только redirect на `/movements`, без новой логики;
   - некорректно: оба маршрута развиваются как равноправные primary paths.

5. **Dual DTO fields только как временный мост:**
   - корректно: canonical field primary, legacy field versioned и sunset-ограничен;
   - некорректно: dual fields остаются бессрочно без canonical доминанты.
