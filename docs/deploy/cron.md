# Deploy: Digest cron (GitHub Actions)

Workflow: `.github/workflows/digest.yml`

## 1) GitHub Secrets
В репозитории откройте `Settings → Secrets and variables → Actions` и добавьте:
- `APP_URL` — публичный URL production приложения (например, `https://your-app.vercel.app`).
- `JOB_SECRET` — секрет для заголовка `x-job-secret`.

## 2) Включение workflow
- Workflow `Daily Telegram Digest` запускается по расписанию и вручную (`workflow_dispatch`).
- Убедитесь, что GitHub Actions включены для репозитория.

## 3) Тест вручную через curl
```bash
curl --fail --show-error --silent \
  -X POST "${APP_URL}/api/jobs/digest" \
  -H "x-job-secret: ${JOB_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 4) Если `401 Unauthorized`
- Проверьте, что `JOB_SECRET` в GitHub Secrets совпадает с `JOB_SECRET` в Vercel env.
- Проверьте заголовок `x-job-secret`.

## 5) Если timeout / сетевые ошибки
- Проверьте корректность `APP_URL` (https, без лишнего `/`).
- Проверьте, что deployment на Vercel активен.
- Проверьте логи Vercel и GitHub Actions для статуса запроса.
