# Codex Prompt Standard (канонический стандарт постановки задач)

> Версия: 2026-03-09 (verification upgrade).
>
> Это обязательный стандарт подготовки всех последующих Codex-промтов по проекту ARTSTUDIO Consumables.
>
> Ни один существенный шаг реализации, рефакторинга, документационной интеграции или выравнивания repo не должен запускаться вне этого стандарта.
>
> Стандарт введён для защиты проекта от формальной, поверхностной и нетрассируемой реализации.
>
> Каждый будущий промт обязан быть связан с:
> - `docs/roadmap/master-plan.md`;
> - `docs/roadmap/canon-traceability-map.md`;
> - релевантными каноническими документами `docs/product/canon/*`;
> - `docs/roadmap/progress-log.md`.

## 1. Execution-gating: обязательность test/QA/verification

- Ни один значимый Codex-промт не считается полным без явных блоков **Test strategy**, **QA / verification steps** и **Evidence of successful verification**.
- Если задача затрагивает модель, поведение, flows, consistency, observability, control plane, shell, cost-layer или reliability, промт обязан явно фиксировать, **что именно проверяется, как проверяется, где проверяется и что считается успехом**.
- Отсутствие test/QA/evidence-блоков — это **дефект постановки задачи**, а не допустимое упрощение.
- Acceptance без verification loop не является завершением задачи.

## 2. Статус стандарта

- Статус: `active, mandatory, execution-gating`.
- Область применения: все значимые Codex-задачи (разработка, рефакторинг, docs-интеграция, выравнивание repo).
- Режим обязательности: отсутствие обязательных блоков промта означает, что задача сформулирована невалидно и не должна запускаться.

## 3. Назначение стандарта

Codex-промт в этом проекте — не запрос «сделай X», а управляемый инструмент реализации канона в репозитории.

Корректный промт обязан предотвращать:

- формальный patching без глубины;
- локальную реализацию без связи с моделью;
- UI-реализацию без model-layer изменений там, где они обязательны;
- docs-only реализацию там, где требуется изменение поведения системы;
- naming cleanup без structural cleanup;
- тесты-ширмы вместо проверки фактического соответствия канону;
- «готово» без воспроизводимого verification-прохода.

## 4. Обязательные принципы Codex-промта

1. **Traceability first**
   - Каждый промт обязан быть привязан к шагу/подшагу master-plan и к конкретным канонам.
2. **Scope clarity**
   - Scope задачи обязан быть ясным, ограниченным и операционно проверяемым.
3. **Deep implementation over visible patch**
   - Промт обязан требовать глубинную реализацию, а не только видимый поверхностный эффект.
4. **Repo-aware execution**
   - Промт обязан учитывать текущую структуру repo и существующие слои, а не абстрактную «идеальную систему».
5. **Acceptance must be testable**
   - Acceptance criteria обязаны быть проверяемыми по артефактам repo и поведению системы.
6. **No checkbox implementation**
   - Промт не должен допускать формальное закрытие пункта без содержательного закрытия канона.
7. **Explicit non-goals**
   - Промт обязан явно фиксировать, что в рамках задачи не делается.
8. **Verification is part of implementation**
   - Реализация считается неполной, если не задано, как она проверяется.
9. **Tests must match layer of change**
   - Тип тестов обязан соответствовать слою воздействия: schema/data contracts, domain/application, read-models/projections, routes/API, UI/interaction, integration/e2e.
   - `docs / operational artifacts only` допустимо только для действительно docs-only задач.
10. **QA must be explicit, not assumed**
    - Нельзя считать, что «разработчик сам поймёт, что прогнать».
    - Промт обязан явно задать: что проверять, чем проверять, на каком окружении, какой результат успешный.
11. **Environment reproducibility matters**
    - Если нужен локальный/CI прогон, промт обязан явно описать prerequisites, команды подготовки, необходимые сервисы/базы/seeds/fixtures.
    - Промт обязан фиксировать, какие секреты нельзя подменять вымышленными значениями.
12. **SLA and operational trust are part of done-definition**
    - Для reliability/consistency/timing/observability/degradation/recovery/control-plane задач промт обязан фиксировать затронутые SLA/метрики и проверку отсутствия деградации доверия к продукту.

## 5. Структура каждого будущего промта

Каждый значимый Codex-промт обязан содержать блоки строго в этом порядке:

1. Название задачи
2. Тип работы
3. Цель
4. Место в master-plan
5. Каноническое основание
6. Репозиторные точки воздействия
7. Текущее проблемное состояние / gap
8. Почему без этой задачи repo ещё не соответствует канону
9. Что именно нужно сделать
10. Ограничения / что не делать
11. Acceptance criteria
12. Test strategy
13. QA / verification steps
14. Environment / setup requirements
15. Commands to run
16. SLA / metrics impact
17. Evidence of successful verification
18. False-positive completion risks
19. Ожидаемое обновление progress-log / docs после выполнения

## 6. Обязательные требования к verification-блокам

### 6.1 Test strategy

Промт обязан явно отвечать:

- какие тестовые слои затрагиваются;
- какие тесты нужно **добавить**, какие **обновить**;
- какие проверки обязательные (must-pass), какие optional/supplementary;
- когда docs-only изменение действительно не требует тестов;
- когда отсутствие тестов недопустимо.

Минимальный перечень слоёв, который должен быть явно разобран в релевантном виде:

- unit / domain tests;
- application / use-case tests;
- projection / read-model tests;
- API / route tests;
- component / interaction tests;
- integration / e2e checks;
- migration / seed / fixture verification;
- manual QA, если automation не покрывает critical path полностью.

### 6.2 QA / verification steps

Секция обязана задавать конкретную воспроизводимую последовательность, а не общий текст.

Минимальный формат:

1. Подготовить окружение.
2. Выполнить миграции/seed/fixtures (если релевантно).
3. Прогнать обязательные automated tests.
4. Выполнить manual или интеграционную проверку критичного flow.
5. Проверить отсутствие регрессии на ключевом пути.
6. Сверить docs/progress-log/artifacts.

### 6.3 Environment / setup requirements

Промт обязан явно указывать prerequisites для успешной локальной и CI-проверки, где это необходимо:

- test database;
- prisma migrate / db push / seed;
- обязательные env vars;
- mock services / fake providers / local adapters;
- build steps;
- background services;
- очистка/подготовка fixtures;
- запрет на неполные/вымышленные секреты.

Дополнительно обязательно:

- если окружение потенциально нестабильно/ограничено, это фиксируется явно;
- промт не предполагает «магически готовое окружение»;
- verification должен быть описан так, чтобы его можно было воспроизвести независимо от автора.

### 6.4 Commands to run

Промт обязан содержать repo-realistic команды проверки:

- конкретные команды;
- порядок выполнения;
- обязательные команды и optional/supplementary;
- критерий успешности для каждой команды.

Фиктивные команды и декоративный verification запрещены.

### 6.5 SLA / metrics impact

Каждый промт обязан явно указать один из двух режимов:

- `SLA / metrics impact: not materially affected`;
- или перечислить затронутые product-relevant SLA/operational expectations и способ проверки.

SLA/операционные метрики в этом стандарте включают:

- availability;
- consistency;
- propagation delay;
- recovery time;
- error visibility;
- explainable degradation;
- integrity of critical flows.

Содержательная SLA-секция обязательна для задач по:

- write/read consistency;
- recovery/replay/rebuild;
- safe degradation;
- observability;
- control plane;
- critical user flows;
- performance-sensitive lists/hub/reports;
- auditability;
- permissions/security-sensitive surfaces.

### 6.6 Evidence of successful verification

Недостаточно написать «тесты прошли». Промт обязан требовать evidence вида:

- какие suites/проверки зелёные;
- какие команды успешно выполнены;
- какой manual/integration flow пройден;
- какие артефакты обновлены;
- какие метрики/сигналы сохранены или улучшены;
- какие legacy-gaps больше не воспроизводятся.

### 6.7 False-positive completion risks

Промт обязан явно перечислить, что считается ложноположительным «готово», включая релевантные риски:

- код написан, но env setup не позволяет реально проверить change;
- route существует, но flow не работает end-to-end;
- тесты зелёные, но не покрывают changed layer;
- схема обновлена, но seed/fixtures/adapters не синхронизированы;
- UI обновлён, но model-layer не согласован;
- заявлен SLA-safe change, но metrics/observability не проверены;
- «работает локально» только в неканонически подготовленном окружении.

## 7. Матрица обязательности тестов и QA по типу задачи

| Тип задачи | Обязательные тестовые слои | Нужен manual QA | Нужна env preparation | SLA / metrics секция |
|---|---|---|---|---|
| docs-only | Проверка ссылок/структуры docs; smoke на отсутствие противоречий | Обычно нет | Обычно нет | Явно: `not materially affected` |
| roadmap / governance docs | Проверка согласованности с master-plan/traceability/progress-log | Опционально (review walkthrough) | Нет | Явно: `not materially affected` |
| naming / model migration | schema/data contracts + domain/application + regression | Да, если влияет на критичные flows | Да (db + migration + fixtures) | Обязательна, если влияет на consistency/reliability |
| prisma/schema/data migration | migration + seed/fixture + integration на контракты данных | Да, для критичных сценариев чтения/записи | Да (db, migrate, seed) | Обычно обязательна |
| application/use-case logic | unit/domain + use-case + integration | Да, если automation не покрывает critical path | Часто да | По влиянию; часто обязательна |
| read-side/projection | projection/read-model + integration + API/read checks | Да для ключевых read flows | Да (rebuild/replay/fixtures) | Обязательна (consistency/latency) |
| UI-only cosmetic change | component/interaction smoke | Опционально визуальный smoke | Обычно нет | Явно: `not materially affected` |
| UI + flow change | component/interaction + API/integration + e2e/smoke | Да (critical path walkthrough) | Часто да | По влиянию на critical flow |
| admin / control plane | route/API + integration + permissions | Да | Да (roles/env/services) | Обязательна |
| permissions / access / role-sensitive logic | permissions matrix tests + API/integration + negative tests | Да (роль-ориентированные сценарии) | Да (roles, fixtures, auth) | Обязательна |
| recovery / consistency / reliability / observability | integration/recovery + replay/rebuild + failure-mode tests | Да | Да (fault-ready setup, data snapshots) | Обязательна |
| shell / navigation / search / filters | interaction + API/read-model + e2e critical path | Да для UX/регрессии | Часто да (fixtures/indexes) | По влиянию на latency/consistency |
| analytics / reports / cost layer | data-contract + projection + integration/report checks | Да для валидации данных | Да (seed/datasets/jobs) | Обязательна |

## 8. Минимальный verification contract для задачи

Минимальный контракт обязателен для любого значимого промта:

1. Задача не завершается без проверки, соответствующей слою изменения.
2. Проверка должна быть воспроизводимой.
3. Среда проверки должна быть описана.
4. Acceptance без verification evidence считается неполным.
5. Если прогон невозможен в текущем окружении, это явно фиксируется как ограничение среды, а не замалчивается.

## 9. Требования к acceptance criteria

Acceptance criteria обязаны:

1. Быть конечными и проверяемыми.
2. Различать эффекты по уровням: docs-level, model-level, flow-level, UI-level, test-level (где релевантно).
3. Исключать двусмысленность «примерно/частично похоже».
4. Отвечать на вопрос: как понять, что канон реализован глубоко, а не только показан на поверхности.
5. Быть привязаны к шагу master-plan и к конкретному canon-gap.
6. Быть связаны с verification-блоками (test strategy, QA steps, commands, evidence).

## 10. Что считается поверхностной реализацией

К общим антипаттернам относятся:

- placeholder вместо реального слоя;
- docs without code change там, где требуется код;
- UI without model cleanup;
- rename without semantic migration;
- partial route without coherent flow;
- тест, не проверяющий реальный канон;
- реализация, оставляющая legacy-path фактически основным;
- визуальное наличие функции без product-level integration;
- закрытие acceptance через локальный hack;
- декларирование «готово» без воспроизводимого verification evidence.

## 11. Что считается глубокой реализацией

Глубокая реализация подтверждается, если одновременно выполнено:

1. Изменение укладывается в канон и закрывает конкретный canon-gap.
2. Модель, flows, naming, docs и tests согласованы между собой.
3. Нет скрытого системного противоречия (включая критичный legacy leakage).
4. Решение работает в структуре repo, а не «рядом» с ней.
5. Продукт становится canon-complete глубже, а не просто visually richer.
6. Implementation оставляет проверяемый след для progress-log и будущего аудита.
7. Verification loop пройден и подтверждён evidence.

## 12. Как использовать стандарт вместе с master-plan, traceability map и progress-log

- `master-plan` задаёт маршрут и порядок шагов.
- `canon-traceability-map` связывает каноны с gaps и целевыми шагами.
- `codex-prompt-standard` задаёт обязательное качество постановки каждой задачи.
- `progress-log` фиксирует фактическое продвижение и глубину закрытия.
- Эти четыре документа работают как единый operational loop:
  `канон → traceability map → master-plan → codex prompt → implementation → verification evidence → progress-log`.

## 13. Канонический шаблон будущего Codex-промта

```md
# [Название задачи]

## Тип работы
- <implementation / refactoring / docs-integration / mixed>

## Цель
- <какой канонический и продуктовый результат должен быть достигнут>

## Место в master-plan
- Шаг: <номер шага>
- Подшаг: <номер подшага, если есть>
- Критичные зависимости: <какие предыдущие шаги должны быть уже закрыты или достаточно зрелы>

## Каноническое основание
- Каноны: <список конкретных канонов>
- Документы: <конкретные файлы из docs/product/canon/*>
- Связанный gap из traceability map: <какой именно разрыв закрывается>

## Репозиторные точки воздействия
- Ожидаемые слои изменений:
  - docs: <да/нет + какие файлы>
  - prisma/schema: <да/нет + какие сущности>
  - seed/fixtures: <да/нет>
  - domain/application: <да/нет + какие модули>
  - read-models/projections: <да/нет>
  - routes/API: <да/нет>
  - UI/components: <да/нет>
  - tests: <да/нет + уровень тестов>
  - admin/control plane: <да/нет>
  - configs/scripts: <да/нет>

## Текущее проблемное состояние / gap
- <описание текущего разрыва в repo>
- <как gap проявляется в коде/поведении/документации>

## Почему без этой задачи repo ещё не соответствует канону
- <прямое объяснение несоответствия>
- <какие канонические требования остаются невыполненными>

## Что именно нужно сделать
1. <конкретное действие/результат 1>
2. <конкретное действие/результат 2>
3. <конкретное действие/результат 3>

## Ограничения / что не делать
- <явные non-goals>
- <запрет на несвязанные изменения>
- <запрет на имитацию широкого закрытия вне scope>

## Acceptance criteria
1. <проверяемый критерий docs-level (если релевантно)>
2. <проверяемый критерий model-level>
3. <проверяемый критерий flow-level>
4. <проверяемый критерий UI-level (если релевантно)>
5. <проверяемый критерий test-level>

## Test strategy
- Затрагиваемые слои тестирования: <unit/domain | use-case | projection/read-model | API/route | component/interaction | integration/e2e | migration/seed/fixture>
- Новые тесты: <какие обязательны>
- Обновления существующих тестов: <какие обязательны>
- Optional/supplementary проверки: <если есть>
- Обоснование docs-only без тестов (если применимо): <почему допустимо>
- Почему отсутствие тестов недопустимо (если задача не docs-only): <обоснование>

## QA / verification steps
1. <подготовка окружения>
2. <миграции/seed/fixtures>
3. <обязательные automated checks>
4. <manual/integration проверка critical flow>
5. <проверка отсутствия регрессии>
6. <сверка docs/progress-log/artifacts>

## Environment / setup requirements
- Обязательные env prerequisites: <db/services/env vars/secrets>
- Подготовка данных: <migrate/db push/seed/fixtures>
- Локальные адаптеры/моки: <что нужно>
- Build/background prerequisites: <что должно быть запущено>
- Ограничения среды: <известные ограничения и риски нестабильности>
- Запреты: <какие вымышленные/неполные секреты недопустимы>

## Commands to run
1. <command 1> — <обязательная/optional> — <критерий успеха>
2. <command 2> — <обязательная/optional> — <критерий успеха>
3. <command 3> — <обязательная/optional> — <критерий успеха>

## SLA / metrics impact
- Режим: <`not materially affected` | `materially affected`>
- Если materially affected:
  - Затронутые метрики/ожидания: <availability/consistency/propagation delay/recovery time/error visibility/explainable degradation/integrity>
  - Как проверяется отсутствие деградации: <конкретные проверки>
  - Какие сигналы/метрики должны быть сохранены или улучшены: <список>

## Evidence of successful verification
- Green test suites: <какие именно>
- Successful commands: <что выполнено>
- Manual/integration evidence: <какой flow пройден>
- Обновлённые артефакты: <какие файлы/контракты/дашборды>
- SLA/metrics evidence: <что подтверждено>
- Legacy gap no longer reproducible: <как проверено>

## False-positive completion risks
- <риск 1>
- <риск 2>
- <риск 3>
- <что будет считаться ложноположительным “готово”>

## Ожидаемое обновление progress-log / docs после выполнения
- Progress-log: <какая запись, в каком шаге/подшаге, с каким статусом>
- Docs sync: <какие документы должны быть обновлены>
```

## 14. Жёсткие правила применения шаблона

- Если задача затрагивает код, данные, схему, flows, control plane, reliability или observability, отсутствие test/QA/verification-блоков является дефектом постановки.
- Если задача требует локального или CI-прогона, промт обязан явно указать:
  - что должно быть подготовлено;
  - что именно запускается;
  - какие условия считаются успешными;
  - какие ограничения среды известны.
- Нельзя подменять verification общими фразами или декларацией «дальше проверим по ходу».
