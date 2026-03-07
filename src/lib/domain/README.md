# Канонический domain-layer (R2.1)

Этот слой вводит канонический язык предметной области без разрушительного переименования persistence-моделей.

## Состав

- `accounting-position/*` — каноническая сущность **«Позиция учёта»** и мапперы в/из legacy `Item`.
- `position-catalog/*` — реестр **«Каталог позиций»** как read-side контракт.
- `directories/*` — слой **«Справочники»** и mapping legacy dictionary-типов.

## Compatibility policy

- Prisma/DB модель `Item` и API `/api/items` сохраняются для обратной совместимости.
- Вся новая предметная логика должна опираться на канонические типы `AccountingPosition`/`PositionCatalog`.
- Legacy-термины используются только в persistence/integration контуре и отмечаются как техническое наследие.
