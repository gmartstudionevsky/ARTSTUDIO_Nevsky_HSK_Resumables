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
