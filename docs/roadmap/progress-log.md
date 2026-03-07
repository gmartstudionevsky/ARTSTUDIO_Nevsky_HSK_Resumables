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
