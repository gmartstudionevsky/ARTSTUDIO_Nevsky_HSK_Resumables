# Карта канонических write-flow vNext

Связанные документы:

- ADR-004: [../adr/ADR-004-writeflow-readmodel.md](../adr/ADR-004-writeflow-readmodel.md)
- Доменная карта: [./domain-model.md](./domain-model.md)
- Инварианты: [./invariants.md](./invariants.md)

## 1. Канонические классы write-flow

1. **Формирование/изменение сущностей**
   - Создание и изменение Позиции учёта, справочников, классификаторов.
2. **Учётные события**
   - Создание, отмена, коррекция Движений, OPENING, INVENTORY_APPLY.
3. **Синхронизационные сценарии**
   - Импорт, повторная синхронизация, регламентированная загрузка данных из внешних источников.
4. **Управляющие сценарии**
   - Изменение конфигураций, ролей, feature flags, запуск reset/rollback/re-sync из control plane.

## 2. Единый шаблон write-flow

Каждый write-flow обязан следовать канонической последовательности:

1. **Приём команды**
   - Команда поступает из UI, импорта или административной панели.
2. **Проверка допустимости**
   - Проверяются права, состояние сущностей, контекст и режим пространства.
3. **Сборка канонического намерения**
   - Формируется полный объект намерения с обязательной семантикой.
4. **Полная валидация**
   - Проверяются инварианты, аналитические оси, непротиворечивость и полнота.
5. **Фиксация канонического изменения**
   - Изменение фиксируется атомарно в каноническом слое.
6. **Перестроение зависимых представлений**
   - Read-model и проекции обновляются как производные от зафиксированного изменения.
7. **Аудит и понятный результат**
   - Записывается аудит, вызывающая сторона получает однозначный результат.

## 3. Классификация ключевых сценариев

| Сценарий                                   | Класс write-flow                 | Комментарий                                                              |
| ------------------------------------------ | -------------------------------- | ------------------------------------------------------------------------ |
| Создание позиции                           | Формирование/изменение сущностей | Создаёт каноническую Позицию учёта, не проекцию.                         |
| Изменение позиции                          | Формирование/изменение сущностей | Обновляет атрибуты позиции в пределах инвариантов.                       |
| Деактивация/реактивация позиции            | Формирование/изменение сущностей | Меняет рабочий статус без потери истории.                                |
| Создание движения                          | Учётные события                  | Формирует событие, влияющее на состояние и историю.                      |
| Отмена движения                            | Учётные события                  | Создаёт регламентированный компенсирующий контур, а не «тихое удаление». |
| Коррекция движения                         | Учётные события                  | Выполняется как канонический сценарий корректировки с полным аудитом.    |
| OPENING-сценарий                           | Учётные события                  | Выполняется как тип события движения OPENING.                            |
| Применение инвентаризации                  | Учётные события                  | Выполняется как тип события INVENTORY_APPLY.                             |
| Импорт / sync                              | Синхронизационные сценарии       | Внешний источник проходит тот же канонический pipeline.                  |
| Изменение состава аналитик                 | Управляющие сценарии             | Влияет на конфигурацию, а не переписывает историю вручную.               |
| reset / rollback / re-sync (control plane) | Управляющие сценарии             | Запускает регламентированные восстановительные действия.                 |

## 4. Точки входа и границы ответственности

- **UI, импорт и административная панель** — только точки входа в write-flow.
- Они **не являются** самостоятельными носителями предметной логики.
- Предметная логика и инварианты живут в каноническом write-flow/application-domain слое.

## 5. Анти-паттерны write-flow

Недопустимо:

1. Фиксировать состояние сразу в read-model без канонического commit.
2. Разрешать частично заполненные события «на потом».
3. Выполнять админ-изменения, которые обходят проверки допустимости.
4. Вручную чинить проекции вместо запуска регламентированного recovery-сценария.


## 6. Кодовая привязка R3.1 (application/use-case write-side)

На этапе R3.1 канонический write-flow перестал быть только документальной схемой и закреплён в исполняемом application-слое:

- `src/lib/application/write-flow/types.ts` — общий command/result контракт write-flow (`success`/`validation|invariant|not_found|conflict|unexpected`).
- `src/lib/application/accounting-position/contracts.ts` — команды и результаты write-flow для «Позиции учёта».
- `src/lib/application/accounting-position/service.ts` — use-case сценарии:
  - `accounting-position.create`;
  - `accounting-position.update`;
  - `accounting-position.set-active-state`.

Переведённые точки входа (адаптеры):

- `POST /api/items`;
- `PATCH /api/items/[id]`;
- `POST /api/items/[id]/toggle-active`.

Route handlers в touched area теперь выполняют только приём/парсинг запроса, вызов use-case и возврат HTTP-ответа; каноническая write-логика вынесена в application-слой.


## 7. Кодовая привязка R3.2 (событийный write-side ядра учёта)

R3.2 переводит учётные события в реальный application/use-case слой:

- `src/lib/application/accounting-event/contracts.ts` — command/result контракты для movement/opening/inventory apply, включая `interpretationMode`, projection/recovery outcome.
- `src/lib/application/accounting-event/service.ts` — каноническая реализация write-flow шаблона для событийных сценариев.
- `src/app/api/transactions/route.ts` — адаптер к `createMovement` (без предметной семантики в route).
- `src/app/api/inventory/[id]/apply/route.ts` — адаптер к `applyInventoryResult` (разделение `OPENING` и `INVENTORY_APPLY` сохраняется внутри use-case).

Семантические границы:

- `createMovement` принимает только `IN|OUT|ADJUST` и блокирует попытку провести `OPENING` как обычное движение.
- `createOpening` формирует отдельный класс события `OPENING`.
- `applyInventoryResult` формирует `INVENTORY_APPLY` (или `OPENING` для opening-сессии) и несёт явный `interpretationMode`.


## 8. R3.3 read-side handoff

- Write routes `POST /api/transactions` и `POST /api/inventory/[id]/apply` вызывают `registerProjectionUpdate(...)` с payload из application write-result (`projection`).
- Это фиксирует детерминированный handoff в read-side без внедрения premature async bus.
- Контракт готовит последующую волну recovery/re-sync и проверок консистентности проекций.

## 12. R3.4 recovery use-cases и связь с write-side

R3.4 добавляет отдельный application recovery слой, который использует канонический write-side, но не подменяет его:

- rollback movement выполняется как регламентированная компенсация (cancel), а не удаление событий;
- reset/re-sync работают с производным projection/recovery state и не стирают историю write-side;
- consistency check возвращает structured report для control plane/admin entrypoints.

Это закрепляет полный минимальный контур: `write -> projection handoff -> read -> recovery/check` для already-touched area.

## R4 update: Import v2 как канонический sync write-flow

В touched scope импорт переведён из ad hoc route-логики в application/use-case слой `src/lib/application/import/*`.

Канонический шаблон для Import v2:

1. **Preview / analysis**
   - parse workbook;
   - validate domain-eligible rows;
   - build sync plan (`MATCHED/CREATE/NEEDS_REVIEW/SKIP`);
   - фиксировать draft payload как source для Apply.
2. **Apply / commit**
   - загружает зафиксированный draft payload;
   - блокирует commit при preview errors;
   - выполняет атомарное применение в одной транзакции touched scope;
   - создаёт opening event в режиме `OPENING` (default) или `IN` по явной policy `openingEventMode`;
   - формирует application-level outcome contract.
3. **Recovery bridge**
   - rollback сценарий доступен через use-case (`rollback`) и связан с projection receipts.

Route handlers `/api/admin/import/xlsx/*` являются адаптерами и не содержат предметной import-логики.
