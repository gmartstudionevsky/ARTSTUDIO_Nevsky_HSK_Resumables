# Журнал прогресса master-plan

## Формат записи

Для каждого этапа используем единый шаблон:

- **Дата / этап**
- **Статус этапа** (`not started`, `in progress`, `done`, `blocked`, `deferred`, `changed with rationale`)
- **Что сделано**
- **Что обновлено в docs**
- **Отклонения** (если есть)
- **Следующий шаг**

## Записи

### 2026-03-07 / R0

- **Статус этапа:** `done`
- **Что сделано:**
  - Завершена документальная фиксация канона в репозитории.
  - Канонические решения закреплены как внутренний source of truth в `docs/product` и `docs/adr`.
- **Что обновлено в docs:**
  - Сформирован базовый контур roadmap, спецификации vNext, глоссария и ADR-пакета.
- **Отклонения:**
  - Отклонений от канона не зафиксировано.
- **Следующий шаг:**
  - Выполнить R1: архитектурная формализация ядра и границ слоёв.

### 2026-03-07 / R1

- **Статус этапа:** `done`
- **Что сделано:**
  - Выполнена архитектурная формализация ядра продукта на базе канона:
    - карта доменной модели и границ;
    - карта write-flow;
    - карта read-model и проекций;
    - карта инвариантов;
    - карта recovery-сценариев;
    - архитектурная карта хаба «Движения».
  - Зафиксирована связка: канон -> сущности -> write-flow -> read-model -> инварианты -> recovery.
  - Уточнено, что UI/импорт/админ-панель являются точками входа, но не носителями предметной логики.
- **Что обновлено в docs:**
  - Добавлен каталог `docs/architecture` и связанный индекс.
  - Актуализированы `master-plan`, `spec-vnext`, `glossary`, `docs/README.md`, `README.md`.
- **Отклонения:**
  - Отклонений от канона не зафиксировано.
- **Следующий шаг:**
  - Переход к первому кодовому этапу предметной модели в рамках следующих блоков master-plan (R2+).

## Правило отклонений

Любое отклонение от master-plan или ранее принятого решения:

1. не допускается по умолчанию;
2. фиксируется отдельной записью в этом журнале;
3. сопровождается обоснованием и перечнем изменённых документов;
4. должно сохранять целостность общей логики продукта и дорожной карты.

### 2026-03-07 / R2.1

- **Статус этапа:** `done`
- **Что сделано:**
  - Добавлен канонический domain-layer в коде:
    - `Позиция учёта` (`src/lib/domain/accounting-position/*`);
    - `Каталог позиций` как read-side реестр (`src/lib/domain/position-catalog/*`);
    - `Справочники` как отдельный классификационный слой (`src/lib/domain/directories/*`).
  - Реализован compatibility mapping между legacy persistence-моделью `Item` и канонической сущностью `AccountingPosition`.
  - API `GET /api/items` и `GET /api/items/[id]` теперь формируют канонические представления (`catalogPositions`, `accountingPosition`) параллельно с legacy-ключами.
  - Безопасно обновлены user-facing подписи: «Номенклатура» -> «Каталог позиций».
- **Что обновлено в docs:**
  - Актуализирован `master-plan` (R2 переведён в `in progress`, R2.1 зафиксирован как выполненный).
  - Добавлена compatibility-карта терминов `docs/architecture/terminology-compatibility-r2.1.md`.
  - Обновлены `spec-vnext`, `glossary`, `domain-model`, `docs/architecture/README.md`.
- **Отклонения:**
  - Сознательно сохранены legacy-имена persistence/API (`Item`, `/api/items`, ключ `items`) для обратной совместимости.
  - Отклонение является управляемым и зафиксировано как compatibility-layer, а не новая норма именования.
- **Следующий шаг:**
  - R2.2: добавить базовые аналитические оси (статья затрат/раздел/управляемые параметры) поверх канонической `Позиции учёта`.

### 2026-03-07 / R2.2

- **Статус этапа:** `done`
- **Что сделано:**
  - Каноническая модель `Позиции учёта` расширена базовыми аналитическими осями в коде:
    - `analytics.expenseArticle` как бухгалтерско-складская ось «Статья затрат»;
    - `analytics.section` как рабочая ось «Раздел»;
    - `analytics.controlledParameters` как структурированный extension point управляемых параметров.
  - Введён контракт доступности аналитик `analytics.availability` (`required`/`optional`/`disabled`) без преждевременного ужесточения UI/проекций.
  - Сохранён compatibility-first mapping c legacy `Item`:
    - `defaultExpenseArticle -> analytics.expenseArticle`;
    - `defaultPurpose -> analytics.section`;
    - переходные alias вынесены в `analytics.compatibility`.
- **Что обновлено в docs:**
  - Обновлены `master-plan`, `spec-vnext`, `glossary`, `domain-model`, `invariants`, `read-model-map`.
  - Добавлена compatibility-карта R2.2 для явного соответствия legacy-структуры и канонических осей.
- **Отклонения:**
  - Полный control plane управляемых параметров и продуктовая адаптация отключаемости аналитик по всем экранам сознательно отложены на R2.3+.
- **Следующий шаг:**
  - R2.3: закрепить жёсткие инварианты и правила допустимости состояний write/read контуров с опорой на введённые канонические оси.

### 2026-03-07 / R2.3

- **Статус этапа:** `done`
- **Что сделано:**
  - Добавлен исполняемый слой инвариантов `accounting-position/invariants.ts` с `valid`, списком причин (`issues`) и уровнями проблем (`blocking`/`informational`).
  - Введён policy-контракт участия в расширенных проекциях `projectionEligibility.expandedMetrics`.
  - Усилен compatibility mapping (`mappers.ts`): strict-режим теперь assert-ит канонические инварианты и не пропускает внутренне противоречивую модель.
  - Добавлена write-side защита `accounting-position/write-guards.ts`, подключена в `POST /api/items` и `PATCH /api/items/[id]`.
  - Добавлены unit-тесты `tests/domain/accounting-position.invariants.test.ts` по сценариям допустимости/недопустимости и compatibility mapping.
- **Что обновлено в docs:**
  - `master-plan`, `spec-vnext`, `domain-model`, `invariants`, `read-model-map`.
- **Отклонения:**
  - Полная интеграция eligibility-контракта во все read-model/отчёты отложена на R3 (pipeline-проекций), но базовый контракт зафиксирован в коде.
- **Следующий шаг:**
  - R3: формализация write-flow/read-model pipeline и расширение покрываемого периметра enforce-инвариантов.

### 2026-03-07 / R3.1

- **Статус этапа:** `done`
- **Что сделано:**
  - Введён явный application/use-case слой write-flow `src/lib/application/*` с command/result контрактами и базовым action-context (`actorId`, `correlationId`, `entryPoint`).
  - Реализованы реальные канонические write-flow в `src/lib/application/accounting-position/service.ts`:
    - `accounting-position.create`;
    - `accounting-position.update`;
    - `accounting-position.set-active-state`.
  - В сценариях create/update встроены проверки допустимости через канонические инварианты R2.3 (`validateAccountingPositionWriteDraft`) и compatibility mapping (`mapAccountingPositionDraftToItemDraft` + `mapItemRecordToAccountingPosition`).
  - Переведены route handlers touched area на use-case слой:
    - `POST /api/items`;
    - `PATCH /api/items/[id]`;
    - `POST /api/items/[id]/toggle-active`.
  - Добавлены unit-тесты application write-flow (`tests/application/accounting-position.write-flow.test.ts`).
- **Что обновлено в docs:**
  - `master-plan`, `write-flow-map`, `domain-model`, `invariants`.
- **Отклонения:**
  - Legacy API и persistence (`Item`, `/api/items`) сознательно сохранены для compatibility-first модели; изменён только слой исполнения write-flow.
- **Следующий шаг:**
  - R3.2: расширить application write-side на класс «учётные события» (движения/OPENING/INVENTORY_APPLY) и формализовать pipeline перестроения read-model.


### 2026-03-07 / R3.2

- Статус: done.
- Что сделано:
  - Добавлен канонический application/use-case слой событий учёта: `src/lib/application/accounting-event/*` с явными командами/результатами для `createMovement`, `createOpening`, `applyInventoryResult`.
  - Зафиксирована явная семантика `IN/OUT/ADJUST` (обычные движения), `OPENING` (отдельный сценарий), `INVENTORY_APPLY` (отдельный сценарий с `interpretationMode`).
  - Переведены живые маршруты на новый слой: `POST /api/transactions` и `POST /api/inventory/[id]/apply`; route handlers теперь адаптеры command/result.
  - В result-контракты добавлены projection/recovery поля (`projection`, `recovery`) как минимальный выход в R3.3/R3.4 (read-model/recovery волны).
  - В events write-flow встроено использование инвариантов и availability/compatibility mapping через проверку канонической позиции.
  - Добавлены тесты нового application слоя: `tests/application/accounting-event.write-flow.test.ts`.
- Что осталось на следующую волну:
  - Полная материализация read-model движка/проекций и фоновая оркестрация.
  - Полный recovery toolkit (rollback/reset/re-sync операции).
  - Явный UI-переключатель режима `interpretationMode` для inventory apply (контракт уже заложен).


### 2026-03-08 / R3.2 correction (core-flow e2e regression)

- Статус: fix applied, R3.2 changeset повторно готов к PR-прогону.
- Root cause:
  - после перевода `POST /api/transactions` на новый application-layer route начал возвращать `lines` в каноническом (плоском) формате use-case результата;
  - экран «Операция» (`ResultView`) ожидал legacy view-model с вложенными `line.item/unit/expenseArticle/purpose`;
  - в success-path после `op-save` происходил client-side exception, из-за чего `op-result` не монтировался (и падал `core-flow` e2e).
- Что исправлено:
  - route-adapter `/api/transactions` восстановлен как bridge-контракт: после `createMovement` дополнительно читает `TransactionLine` с include и возвращает UI-совместимый `lines` shape;
  - в `OperationForm` добавлен защитный normalizer post-action результата, чтобы неполный line-payload не приводил к client crash.
- Regression shield:
  - добавлен unit-test `tests/components/operation.result-contract.test.ts` на защиту post-action result contract.
- Локальная воспроизводимость в Codex:
  - установлен Chromium и system deps: `npx playwright install --with-deps chromium`;
  - поднят локальный PostgreSQL (без docker), применены миграции и `seed:test:e2e`;
  - подтверждён зелёный прогон failing spec `tests/e2e/core-flow.spec.ts`.


### 2026-03-08 / R3.3

- Статус: done.
- Что сделано:
  - Введён явный read-side слой `src/lib/read-models/*` с проекциями: каталог позиций, склад, история, базовый отчёт consumption, admin-control.
  - Переведены touched read routes на новый слой: `GET /api/items`, `GET /api/stock`, `GET /api/transactions`, `GET /api/reports/consumption`, `GET /api/settings`.
  - Связь с R3.2 projection contracts закреплена через `registerProjectionUpdate(...)` в write routes `POST /api/transactions` и `POST /api/inventory/[id]/apply`.
  - В каталог/склад/аналитику встроены availability+eligibility признаки (`projectionEligibility.expandedMetrics`) без второй правды.
  - Добавлены unit-тесты read-model/projections: `tests/read-models.projections.test.ts`.
- Что оставлено на следующий шаг:
  - Фоновый async projection engine и persistent re-sync orchestration (пока только contracts/receipts foundation).
  - Расширение coverage на полный набор legacy read endpoints и richer report projections.

### 2026-03-08 / R3.4

- Статус: done.
- Что сделано:
  - Введён явный recovery/use-case слой `src/lib/application/recovery/*` с контрактами и сервисом для `rollbackMovement`, `resetReadModelState`, `resyncReadModel`, `checkReadModelConsistency`.
  - Реализован локальный rollback для touched event scenario (movement `IN/OUT/ADJUST`) через каноническую отмену (`RecordStatus.CANCELLED`) + аудит (`ROLLBACK_MOVEMENT`) без удаления истории.
  - Добавлен reset производного recovery state: управляемый сброс projection receipts (`clearProjectionReceipts`) без влияния на канонический журнал событий.
  - Добавлен re-sync базовых touched проекций (`catalog`, `stock`, `history`, `reports`, `admin`, `signals`) через пересинхронизацию receipts от актуального канона.
  - Реализован consistency checker с различением состояний:
    - blocking inconsistency (`MISSING_RECEIPT`, `STALE_RECEIPT`, `RECEIPT_EVENT_NOT_FOUND`, `RECEIPT_TYPE_MISMATCH`);
    - acceptable reduced eligibility (`REDUCED_ELIGIBILITY`);
    - fully consistent.
  - Введён internal service-level entrypoint через `createRecoveryService(...)`; вызовы покрыты unit-тестами use-case слоя (без публичного маршрута на этом шаге).
  - Расширен registry-контракт проекций: nullable receipts + точечные операции `set/get/clear`.
  - Добавлены unit-тесты recovery/use-case и consistency checker: `tests/application/recovery.use-cases.test.ts`.
- Что обновлено в docs:
  - `master-plan`, `progress-log`, `recovery-model`, `read-model-map`, `write-flow-map`, `invariants`.
- Отклонения:
  - На шаге R3.4 rollback ограничен movement-сценариями; rollback `OPENING` и `INVENTORY_APPLY` сознательно отложены как отдельные recovery сценарии следующей волны.
- Следующий шаг:
  - Либо product block R4 (движения-хаб), либо import v2 как частный сценарий синхронности на базе введённого recovery контракта.

### 2026-03-08 / R4

- Статус: done.
- Что сделано:
  - Введён канонический sync/use-case слой импорта: `src/lib/application/import/*`.
  - Явно разделены фазы Preview и Apply:
    - preview (`previewFromWorkbook`) парсит/валидирует пакет, строит sync-план, фиксирует draft import job;
    - apply (`apply`) использует зафиксированный preview payload, применяет изменения атомарно в транзакции и формирует outcome contract.
  - Import entrypoints переведены на новый application слой: `POST /api/admin/import/xlsx/preview`, `POST /api/admin/import/xlsx/commit`, `POST /api/admin/import/xlsx/rollback`.
  - В apply добавлена управляемая семантика opening (`openingEventMode: OPENING | IN`) без молчаливой догадки; default — `OPENING`.
  - Усилен outcome contract импорта: preview summary + apply summary + blocking/warnings + opening mode + projections + recovery strategy.
  - Добавлена связка import apply/rollback с read-model projection receipts (`registerProjectionUpdate`, `setProjectionReceipt`).
  - Сохранён compatibility bridge для legacy вызовов `src/lib/import/commit.ts` через делегирование в новый use-case слой.
- Тесты:
  - Добавлены unit-тесты нового import sync use-case: `tests/application/import-sync.use-case.test.ts`.
- Локализация ограничений:
  - rollback остаётся scoped-реализацией на touched area (созданные/обновлённые item + opening tx import job) и не претендует на universal rollback engine.

### 2026-03-08 / R5.1

- Статус: done.
- Что сделано:
  - Введён канонический entrypoint хаба «Движения»: новый route `/movements`; legacy `/operation` переведён в redirect для compatibility.
  - Экран «Движения» перестроен вокруг канонической композиции R5.1:
    - верхний слой рабочего контекста (тип движения, дата, режим прихода, выбор раздела);
    - центральное рабочее поле позиций (список по текущему разделу, видимый сразу);
    - action-панель по выбранной позиции без search-first обязательности.
  - Список позиций подключён к каноническому read-model маршруту `/api/items` (проекция `catalog-projection`) через новый client helper `fetchMovementWorkspace(...)` с фильтрацией по `purposeId` (роль раздела).
  - Поиск сохранён как ускоритель: он сужает уже загруженное рабочее поле в выбранном разделе, но не является обязательной первой точкой ввода.
  - Подготовлен foundation для R5.2: выбранная позиция живёт в action-oriented контейнере (quantity/unit/article/purpose/comment + add-to-batch) без перепроектирования экрана.
- Что обновлено в docs:
  - `master-plan`: R5 переведён в `in progress`, добавлена декомпозиция R5.1/R5.2.
  - `movements-hub`: добавлена привязка канонического UI слоя R5.1 к маршруту, контексту раздела и роли поиска.
- Отклонения:
  - Сохранены legacy-компоненты batch/save/cancel/correct внутри нового хаба для compatibility-first и постепенного перехода к R5.2.
- Следующий шаг:
  - R5.2: довести рабочую строку/карточку позиции до полноценно action-ready слоя (локальное раскрытие, серийный ритм, post-action цикл).


### 2026-03-08 / R5.2

- Статус: done.
- Что сделано:
  - Рабочее поле «Движений» переведено на row/card-first модель: каждая позиция рендерится как action-oriented строка/карточка с собственным вводом количества, текущей единицей и кнопкой проведения.
  - Критический путь действия вынесен из legacy form-first панели: типовой commit по позиции теперь выполняется прямо из строки (`Провести`) через существующий write-side route `/api/transactions`.
  - Нативный выбор единицы встроен в строку: для multi-unit показывается select, для single-unit — компактный read-only маркер без лишнего шума.
  - Добавлено локальное раскрытие «Доп. параметры» (статья, назначение, комментарий) без перегрузки первого слоя.
  - Ошибки валидации и ошибки write-side локализуются на уровне конкретной строки и не блокируют всё рабочее поле.
  - Compatibility-first контур сохранён только для touched scope распределённого прихода: режим `DISTRIBUTE_PURPOSES` продолжает работать через batch-линии как foundation к R5.3.
- Тесты:
  - Добавлены unit-тесты `operation.action-row-state` на дефолты, выбор назначения и локальную валидацию строки.
  - Обновлён e2e `core-flow` под row-level action path (поиск -> ввод в строке -> `Провести`).
- Что дальше:
  - R5.3: серийный/массовый режим (правило «заполненная строка = участвует», множественные активные строки, batch confirmation).

### 2026-03-08 / R5.3

- Статус: done.
- Что сделано:
  - Хаб «Движения» переведён в multi-row working model: `rowDrafts` хранит независимые draft-состояния по каждой позиции; ввод в одной строке не затирает соседние.
  - Закреплено каноническое правило участия строки: участвуют только строки с введённым количеством (`isActionRowFilled` / `pickParticipatingRowIds`), без чекбоксов и без selection-first UX.
  - Реализован serial/batch-ready apply path через единый submit (`Провести заполненные строки`), который:
    - собирает только заполненные строки;
    - валидирует каждую участвующую строку локально;
    - блокирует submit при локальных ошибках;
    - отправляет единый `createTransaction` payload в существующий write-side `/api/transactions`.
  - Сохранён быстрый одиночный сценарий: одна заполненная строка проходит тем же путём и не требует отдельного режима.
  - Unit semantics сохранены в multi-row режиме: единица хранится в draft каждой строки, поздняя гидратация единиц не сбрасывает пользовательский `qtyInput`.
  - Локализация ошибок усилена: ошибки строки остаются в строке, общая ошибка serial submit показывается отдельно (`workspaceError`).
- Что обновлено в docs:
  - `master-plan`: R5.3 отмечен как `done`.
  - `movements-hub`: зафиксирована реализация R5.3 и foundation под следующий этап post-action.
- Отклонения:
  - Визуальная кнопка в строке сохранена как affordance действия, но пользовательская модель участия остаётся канонической: участие определяется только фактом заполнения строки.
- Следующий шаг:
  - R5.4: post-action цикл, локальная коррекция/подтверждение, более богатое раскрытие второго слоя аналитик без смены архитектуры хаба.

### 2026-03-08 / R5.3 correction (core-flow regression fix)

- Статус: done.
- Root cause:
  - В R5.3 row-level кнопка `op-row-submit-*` перестала запускать submit и только подготавливала строку (`ensureItemRowReady`), поэтому `result` не устанавливался и `op-result` не монтировался в single-row core-flow.
- Что исправлено:
  - Восстановлен row-submit success-path: кнопка строки снова инициирует submit.
  - Добавлен scoped submit для single-row (`onlyItemId`) внутри общей serial-функции, чтобы сохранить multi-row архитектуру и не ломать массовый режим.
  - Добавлен targeted regression test на контракт single-row scope для row-submit.
- Следующий шаг:
  - Продолжить R5.4 (post-action слой) без изменения канона R5.3.

### 2026-03-08 / R5.4

Что сделано:
- В хабе «Движения» введён канонический локальный post-action слой (`PostActionState` + `ResultView`): после submit пользователь остаётся в том же workspace и получает читаемый итог по участвовавшим строкам (`single`/`multi`).
- Добавлен быстрый локальный rollback последнего действия через recovery use-case foundation R3.4: новый UI-экшен `Локально отменить последнее действие` и API path `POST /api/transactions/[id]/rollback` (movement touched safe scope).
- Добавлена локальная коррекция недавнего действия без перехода в «Историю»: `Исправить в рабочем поле` ре-гидратирует строку результата обратно в текущий row draft (action-ready состояние), сохраняя раздел и рабочий контекст.
- Разведены состояния:
  - row-level validation остаётся в `rowDrafts[*].error`;
  - workspace submit failure остаётся в `workspaceError`;
  - success/result живёт в `postAction`;
  - rollback/correction ошибки отображаются локально без смешивания с validation-path.
- Result layer согласован с multi-row foundation R5.3: summary и line-list показывают именно участвовавшие строки, не сбрасывая весь workspace.

Обновлённые документы:
- `master-plan`: R5.4 отмечен как `done`.
- `movements-hub`: зафиксирован пост-экшен цикл (result/rollback/correction) внутри одного хаба.
- `recovery-model`: уточнён UI-bridge к recovery use-case для touched safe rollback в «Движениях».

Ограничения шага (осознанно оставлено на следующий слой):
- rollback UI в хабе ограничен movement-сценариями `IN/OUT/ADJUST`;
- correction matrix остаётся scoped: быстрый rehydrate path для недавних строк + существующий модальный корректор, без full historical editing grid;
- rich second-layer details (расширенные аналитики/мини-таймлайн) остаются задачей следующего шага.

### 2026-03-08 / R5.5

- Статус: done.
- Что сделано:
  - В рабочей строке хаба «Движения» добавлено локальное раскрытие второго слоя (`2-й слой`) без перехода в отдельный экран и без глобальной панели аналитик.
  - Первый слой сохранён action-ready (позиция, количество, единица, submit), а аналитики/пояснения/вторичные действия вынесены во второй слой строки.
  - Во втором слое добавлены локальные блоки:
    - аналитики второго слоя (section/expenseArticle в контексте строки);
    - controlledParameters как extension point c явным отображением availability/valuesCount;
    - вторичные действия: показать/скрыть пояснения, показать/скрыть managed параметры, сбросить локальный draft;
    - контекстные спокойные eligibility/availability пояснения для reduced-eligibility и отключённых/опциональных параметров.
  - Состояние второго слоя изолировано в row draft (`secondLayerExpanded`, `showEligibilityHint`, `showControlledParameters`), что сохраняет serial-flow: раскрытие одной строки не сбрасывает другие drafts и не ломает правило `filled row = participates`.
  - Post-action correction path (rehydrate) согласован со вторым слоем: `buildCorrectionPatch` открывает строку для локальной корректировки и не конфликтует с action-ready контролами.
- Тесты:
  - Обновлены unit-тесты row-state/post-action контрактов под второй слой.
  - Добавлены тесты на eligibility hints и payload-guard для второго слоя.
- Следующий шаг:
  - refinement mobile/desktop поведения второго слоя и richer UX-подсказки (без смены архитектурной модели хаба).

### 2026-03-08 / Re-baseline after concept-repo-deploy audit

- **Статус этапа:** `changed with rationale`
- **Что сделано:**
  - Проведён сквозной аудит трёх источников: репозиторий, текстовая концепция, скрининг после деплоя.
  - Пересобран канонический пакет документации: обновлена спецификация, глоссарий, создан каталог вложенных канонических документов `docs/product/canon/*`.
  - Master-plan пересобран от фактического состояния, а не от исторических optimistic-статусов.
  - Зафиксировано, что foundation ядра уже силён, но хаб «Движения», control plane, отчётность, UX/UI и эксплуатационная зрелость ещё не могут считаться завершёнными.
- **Что обновлено в docs:**
  - `docs/product/spec-vnext.md`
  - `docs/product/glossary.md`
  - `docs/product/canon/*`
  - `docs/audit/2026-03-08-repo-audit.md`
  - `docs/roadmap/master-plan.md`
  - `docs/README.md`
  - `README.md`
- **Отклонения:**
  - Исторический статус `R5 = done` признан завышенным и заменён на более точную декомпозицию в новых блоках 0–9.
  - Legacy-термины признаны допустимыми только как переходный compatibility-layer и подлежащими устранению.
- **Следующий шаг:**
  - Перейти к блоку 1.3 master-plan: устранение legacy-терминов из seed, navigation, UI-copy, импортных шаблонов, тестов и fallback labels.

### 2026-03-08 / Block 0 + Block 1.3 (wave 1)

- **Статус этапа:** `done`
- **Что сделано:**
  - Интегрирован re-baseline пакет документации из `temp`: синхронизированы `README`, `docs/README`, `spec-vnext`, `glossary`, `master-plan`, `progress-log`, `spec-gap-analysis`, добавлены `docs/product/canon/*`, `docs/audit/*`, `docs/archive/*`.
  - Проведена первая волна cleanup пользовательского языка: в UI/seed/fallback обновлены основные термины на канонические (`Каталог позиций`, `Позиция учёта`, `Раздел`, `Статья затрат`).
  - Обновлён import parser/validation: канонические заголовки стали primary (`Позиция учёта`, `Статья затрат`), legacy-заголовки (`Номенклатура`, `Назначение`) оставлены как transitional aliases для backward compatibility.
  - Актуализированы e2e/unit ожидания, связанные с user-facing copy.
- **Что обновлено в docs:**
  - Уточнён `spec-gap-analysis` по актуальному названию пункта навигации.
  - Зафиксирован остаточный technical debt: внутренние model/entity поля `purpose*` и related DB/Prisma имена сохранены как transitional слой до отдельной безопасной миграции.
- **Отклонения:**
  - Массовый rename внутренних доменных/персистентных идентификаторов (`purpose`, `defaultPurposeId`, таблица `Purpose`) сознательно не выполнялся на этом шаге во избежание рискованной миграции.
- **Следующий шаг:**
  - Выполнить вторую волну Block 1.3: вынести transitional aliases импорта в отдельный compatibility policy, подготовить план безопасного переименования внутреннего `purpose`-слоя в канонический `section`.

### 2026-03-08 / Block 1.3 (wave 2, completion pass)

- **Статус этапа:** `done`
- **Что сделано:**
  - Проведён целевой repo-audit remaining legacy после первой волны: UI-copy, import UI, отчёты, история, admin labels, telegram templates, parser aliases и связанный тестовый слой.
  - Доведён пользовательский слой до канонического языка в touched scope: убраны остаточные формулировки `Номенклатура`, `Назначение`, `Статья расходов` из экранного языка и подсказок.
  - Import UX переведён в canon-first коммуникацию: канонический шаблон объявлен основным, legacy-колонки явно описаны как compatibility-only.
  - Import parser оставлен backward-compatible, но локализован: legacy aliases поддерживаются только как переходный слой (`Номенклатура`, `Статья расходов`, `Назначение` -> канонические колонки).
  - Обновлены тексты в operation/history/reports/catalog/admin/telegram так, чтобы основной рабочий контекст был только `Раздел`.
- **Проверки:**
  - `npm run lint`
  - `npm run typecheck`
  - `node --import tsx --test tests/components/operation.action-row-state.test.ts tests/components/operation.post-action-state.test.ts tests/components/operation.result-contract.test.ts tests/application/import-sync.use-case.test.ts`
  - `npm run build`
  - Repo-search после cleanup: в коде legacy-термины остались только в import compatibility aliases и в документации исторического/compatibility характера.
- **Remaining legacy after block 1.3:**
  - Внутренние persistence/domain имена `purpose*` сохранены как локализованный technical debt (безопасность миграций > косметический rename на этом этапе).
  - Import aliases `Номенклатура` / `Статья расходов` / `Назначение` сохранены только как backward compatibility для старых файлов.
  - Исторические документы (`docs/spec-gap-analysis.md`, части старых roadmap/audit записей) сохраняют legacy-лексему как зафиксированный контекст прошлых этапов.
- **Следующий шаг:**
  - Перейти к следующему блоку master-plan (контрольный слой и эксплуатационная зрелость), отдельно спланировав безопасную миграционную волну переименования внутреннего `purpose`-слоя в `section`.
