# Application / Use-case слой

`src/lib/application/*` содержит канонические write-flow (use-case) и их контракты.

Планируемая структура классов write-flow:

- `accounting-position/*` — **формирование/изменение сущностей** (реализовано на R3.1).
- `movement-events/*` — **учётные события** (следующий шаг R3.x/R4).
- `sync-scenarios/*` — **синхронизационные сценарии** (импорт/re-sync).
- `control-plane/*` — **управляющие сценарии**.

Route handlers должны быть адаптерами и вызывать use-case слой, а не хранить предметную логику.
