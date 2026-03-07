# Application / Use-case слой

`src/lib/application/*` содержит канонические write-flow (use-case) и их контракты.

Текущая структура классов write-flow:

- `accounting-position/*` — **формирование/изменение сущностей** (R3.1).
- `accounting-event/*` — **учётные события** (R3.2: movement/opening/inventory apply).
- `sync-scenarios/*` — **синхронизационные сценарии** (импорт/re-sync, следующая волна).
- `control-plane/*` — **управляющие сценарии**.
- `recovery/*` — **канонические сценарии rollback / reset / re-sync / consistency check** (R3.4).

Route handlers должны быть адаптерами и вызывать use-case слой, а не хранить предметную логику.
