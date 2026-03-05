# Release checklist (Vercel + Supabase)

- [ ] `npm run prisma:migrate:deploy` выполнен для production БД.
- [ ] `npm run seed:admin` выполнен один раз.
- [ ] Пароль администратора изменён после первого входа.
- [ ] `npm run seed:defaults` выполнен один раз (ui_texts + settings + optional TG channel).
- [ ] Импорт XLSX wizard проверен в production (`Админка → Импорт`).
- [ ] Telegram test message отправляется успешно.
- [ ] Digest endpoint защищён `JOB_SECRET` и отрабатывает по workflow.
- [ ] Проверен `/api/health` и `/api/health/extended`.
- [ ] Настроена backup-политика: минимум ручной экспорт БД 1 раз в неделю.
- [ ] Rollback-план:
  - [ ] Vercel: открыть deployment history и сделать Promote/Restore предыдущего успешного deployment.
  - [ ] БД: восстановить из последнего доступного backup/экспорта (если требуется откат данных).
