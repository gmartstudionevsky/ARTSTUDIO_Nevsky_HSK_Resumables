# Deploy: Digest cron (production only)

Workflow: `.github/workflows/digest.yml`

## Secrets

- `APP_URL` = `https://artstudio-consumables.vercel.app` (без trailing slash)
- `JOB_SECRET`

## Проверка

```bash
APP_URL_CLEAN="${APP_URL%/}"
curl --fail --show-error --silent \
  -X POST "${APP_URL_CLEAN}/api/jobs/digest" \
  -H "x-job-secret: ${JOB_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{}'
```
