# R2.1: compatibility-карта терминов (legacy -> канон)

> Цель: зафиксировать переход на каноническую модель без разрушительного wholesale-rename persistence-слоя.

## 1. Принцип R2.1

На этапе R2.1 канонический язык внедряется в `domain/application` слой,
а текущие технические имена persistence-слоя (`Item`, `item`, `/api/items`) сохраняются как compatibility-слой.

Это осознанное решение для безопасной эволюции без ломающей миграции БД/API.

## 2. Соответствие сущностей

### 2.1 Позиция учёта

- **Канон:** `Позиция учёта` (`AccountingPosition`).
- **Код канона:** `src/lib/domain/accounting-position/*`.
- **Legacy persistence:** `Item` в Prisma (`prisma/schema.prisma`, model `Item`).
- **Legacy API:** `/api/items`.

Итог: `Item` рассматривается как техническое имя хранения для канонической сущности «Позиция учёта».

### 2.2 Каталог позиций

- **Канон:** `Каталог позиций` (`PositionCatalog`, `PositionCatalogEntry`).
- **Код канона:** `src/lib/domain/position-catalog/*`.
- **Роль:** read-side реестр позиций для операционных экранов.
- **Legacy API-ключ:** `items` (сохранён для обратной совместимости).
- **Канонический API-ключ R2.1:** `catalogPositions` (добавлен параллельно).

### 2.3 Справочники

- **Канон:** `Справочники` как классификационный/управляющий слой.
- **Код канона:** `src/lib/domain/directories/*`.
- **Legacy persistence:** `Category`, `Unit`, `ExpenseArticle`, `Purpose`, `Reason`.
- **Legacy сервис:** `src/lib/admin/dictionaries.ts`.

Итог: legacy-идентификаторы `expense-articles`, `purposes` и т.д. сохраняются в API,
но явно маппятся в канонический слой `DirectoriesRegistry`.

## 3. Границы, зафиксированные в R2.1

1. Каноническая предметная модель живёт в `src/lib/domain/*`.
2. Persistence-модели и исторические имена остаются в `prisma`/`api` как совместимость.
3. Новая кодовая логика должна опираться на канонические типы и мапперы;
   прямое протаскивание legacy-сущностей в новые сценарии не рекомендуется.
4. Следующие этапы R2.2/R2.3 разворачивают аналитики и инварианты поверх `AccountingPosition`,
   а не вокруг терминов `Item/номенклатура`.
