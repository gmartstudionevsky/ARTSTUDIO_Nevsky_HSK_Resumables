import { expect, test } from '@playwright/test';

test('health endpoints are available', async ({ page, request }) => {
  await page.goto('/health');
  await expect(page.getByText('Status:')).toBeVisible();
  await expect(page.getByText('OK')).toBeVisible();

  const apiHealthResponse = await request.get('/api/health');
  expect(apiHealthResponse.ok()).toBeTruthy();
  await expect(apiHealthResponse.json()).resolves.toMatchObject({ status: 'ok' });
});
