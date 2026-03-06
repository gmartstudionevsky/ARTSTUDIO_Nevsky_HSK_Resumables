import { expect, test } from '@playwright/test';

async function login(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login');
  await page.getByTestId('login-login').fill(process.env.E2E_ADMIN_LOGIN ?? 'e2e_admin');
  await page.getByTestId('login-password').fill(process.env.E2E_ADMIN_PASSWORD ?? 'E2EPass12345!');
  await page.getByTestId('login-submit').click();
  await page.waitForURL(/\/(stock|operation)$/);
}

async function createOperation(page: import('@playwright/test').Page, type: 'IN' | 'OUT', qty: string): Promise<void> {
  await page.goto('/operation');
  await page.getByTestId(type === 'IN' ? 'op-tab-in' : 'op-tab-out').click();
  await page.getByTestId('op-item-search').fill('ITM-TEST');
  await page.getByTestId('op-search-item').click();
  const itemsRes = await page.request.get('/api/items?q=ITM-TEST&active=true');
  const itemsPayload = (await itemsRes.json()) as { items: Array<{ id: string; code: string }> };
  const item = itemsPayload.items.find((entry) => entry.code === 'ITM-TEST');
  expect(item).toBeTruthy();
  await page.getByTestId('op-item-option-' + item!.id).waitFor({ state: 'attached' });
  await page.getByTestId('op-item-select').selectOption(item!.id);
  await expect.poll(async () => {
    const unitSelect = page.getByTestId('op-unit');
    return await unitSelect.locator('option').count();
  }).toBeGreaterThan(0);

  const unitValue = await page.getByTestId('op-unit').inputValue();
  if (!unitValue) {
    const firstUnitValue = await page.getByTestId('op-unit').locator('option').first().getAttribute('value');
    if (firstUnitValue) {
      await page.getByTestId('op-unit').selectOption(firstUnitValue);
    }
  }

  await page.getByTestId('op-qty').fill(qty);
  await page.getByTestId('op-add-line').click();
  await expect(page.getByTestId('op-save')).toBeEnabled();
  await page.getByTestId('op-save').click();
  await expect(page.getByTestId('op-result')).toBeVisible();
}

test('history quick actions and saved filters for history/stock', async ({ page }) => {
  await login(page);

  await createOperation(page, 'IN', '10');
  await createOperation(page, 'OUT', '3');

  await page.goto('/history');
  await page.getByLabel('Тип').selectOption('OUT');
  await page.getByTestId('history-save-filter').click();
  await expect(page.getByTestId('saved-filter-name')).toBeVisible();
  await page.getByTestId('saved-filter-name').fill('Только расход');
  await page.getByTestId('saved-filter-default').check();
  await page.getByTestId('saved-filter-submit').click();
  await expect(page.getByTestId('saved-filter-name')).toBeHidden();
  await expect(page.getByTestId('history-saved-dropdown').locator('option', { hasText: 'Только расход' })).toHaveCount(1);

  await page.reload();
  await expect.poll(async () => page.getByLabel('Тип').inputValue(), { timeout: 15_000 }).toBe('OUT');

  const rowMenu = page.locator('[data-testid^="history-row-menu-"]:visible').first();
  const rowMenuId = await rowMenu.getAttribute('data-testid');
  expect(rowMenuId).toBeTruthy();
  const txId = rowMenuId!.replace('history-row-menu-', '');
  await rowMenu.getByTestId(`history-row-cancel-${txId}`).click();
  const reasonSelect = page.getByLabel('Причина');
  const reasonValue = await reasonSelect.locator('option').nth(1).getAttribute('value');
  if (reasonValue) {
    await reasonSelect.selectOption(reasonValue);
  }
  await page.getByLabel('Комментарий').fill('TEST');
  await page.locator('button:has-text("Подтвердить")').first().click();
  await expect.poll(async () => {
    const txRes = await page.request.get(`/api/transactions/${txId}`);
    if (!txRes.ok()) return 'ERR';
    const payload = (await txRes.json()) as { transaction: { status: string }; uiStatus: string };
    return payload.uiStatus;
  }, { timeout: 15_000 }).toBe('CANCELLED');

  await page.goto('/stock');
  const itemsRes = await page.request.get('/api/items?q=ITM-TEST&active=true');
  const itemsPayload = (await itemsRes.json()) as { items: Array<{ id: string; code: string }> };
  const item = itemsPayload.items.find((entry) => entry.code === 'ITM-TEST');
  expect(item).toBeTruthy();
  await expect(page.getByTestId(`stock-qty-${item!.id}`)).toHaveText(/10/);

  await page.getByTestId('stock-save-filter').click();
  await expect(page.getByTestId('saved-filter-name')).toBeVisible();
  await page.getByTestId('saved-filter-name').fill('Все активные');
  await page.getByTestId('saved-filter-submit').click();
  await expect(page.getByTestId('saved-filter-name')).toBeHidden();
  const stockDropdown = page.getByTestId('stock-saved-dropdown');
  await expect(stockDropdown.locator('option', { hasText: 'Все активные' })).toHaveCount(1);
  const optionValue = await stockDropdown.locator('option', { hasText: 'Все активные' }).getAttribute('value');
  expect(optionValue).toBeTruthy();
  await stockDropdown.selectOption(optionValue!);
  await page.getByRole('button', { name: 'Применить' }).click();
  await page.reload();
  await expect(page.getByTestId('stock-saved-dropdown')).toBeVisible();
});
