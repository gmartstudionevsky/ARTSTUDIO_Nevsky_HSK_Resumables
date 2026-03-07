# Канонический domain-layer (R2.3)

Этот слой вводит канонический язык предметной области без разрушительного переименования persistence-моделей.

## Состав

- `accounting-position/*` — каноническая сущность **«Позиция учёта»** и мапперы в/из legacy `Item`.
- `position-catalog/*` — реестр **«Каталог позиций»** как read-side контракт.
- `directories/*` — слой **«Справочники»** и mapping legacy dictionary-типов.

## Compatibility policy

- Prisma/DB модель `Item` и API `/api/items` сохраняются для обратной совместимости.
- Вся новая предметная логика должна опираться на канонические типы `AccountingPosition`/`PositionCatalog`.
- Legacy-термины используются только в persistence/integration контуре и отмечаются как техническое наследие.


## Аналитические оси R2.2

В `accounting-position/types.ts` и `accounting-position/mappers.ts` зафиксирована каноническая структура аналитик позиции:

- `analytics.expenseArticle` — базовая бухгалтерско-складская ось «Статья затрат»;
- `analytics.section` — базовая рабочая ось «Раздел»;
- `analytics.controlledParameters` — extension point для управляемых параметров control-plane;
- `analytics.availability` — контракт доступности осей (required/optional/disabled) для безопасного перехода к R2.3;
- `analytics.compatibility` — переходные alias к legacy-ключам (`expenseArticleId`/`purposeId`).

Это compatibility-first слой: persistence-модель `Item` и связи `defaultExpenseArticle/defaultPurpose` сохраняются, но в каноническом domain-языке разведены по разным смысловым осям.


## Enforce-слой R2.3

В `accounting-position/invariants.ts` добавлена исполняемая проверка инвариантов с уровнями проблем (`blocking`/`informational`) и policy-признаком `projectionEligibility.expandedMetrics`.

В `accounting-position/write-guards.ts` добавлена write-side защита от полусобранных draft-состояний для required-базовых осей.
