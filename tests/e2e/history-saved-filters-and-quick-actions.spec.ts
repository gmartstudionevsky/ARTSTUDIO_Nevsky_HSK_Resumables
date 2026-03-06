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
  await page.getByTestId('op-item-select').selectOption(item!.id);
  await page.getByTestId('op-qty').fill(qty);
  await page.getByTestId('op-add-line').click();
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
  await page.getByLabel('Название').fill('Только расход');
  await page.getByLabel('По умолчанию').check();
  await page.getByRole('button', { name: 'Сохранить' }).click();

  await page.reload();
  await expect(page.getByLabel('Тип')).toHaveValue('OUT');

  const rowMenu = page.locator('[data-testid^="history-row-menu-"]').first();
  const rowMenuId = await rowMenu.getAttribute('data-testid');
  expect(rowMenuId).toBeTruthy();
  const txId = rowMenuId!.replace('history-row-menu-', '');
  await page.getByTestId(`history-row-cancel-${txId}`).click();
  await page.getByLabel('Комментарий').fill('TEST');
  await page.getByRole('button', { name: 'Подтвердить' }).click();
  await expect(page.getByText('Отменено').first()).toBeVisible();

  await page.goto('/stock');
  const itemsRes = await page.request.get('/api/items?q=ITM-TEST&active=true');
  const itemsPayload = (await itemsRes.json()) as { items: Array<{ id: string; code: string }> };
  const item = itemsPayload.items.find((entry) => entry.code === 'ITM-TEST');
  expect(item).toBeTruthy();
  await expect(page.getByTestId(`stock-qty-${item!.id}`)).toHaveText(/10/);

  await page.getByTestId('stock-save-filter').click();
  await page.getByLabel('Название').fill('Все активные');
  await page.getByRole('button', { name: 'Сохранить' }).click();
  const stockDropdown = page.getByTestId('stock-saved-dropdown');
  const optionValue = await stockDropdown.locator('option', { hasText: 'Все активные' }).getAttribute('value');
  expect(optionValue).toBeTruthy();
  await stockDropdown.selectOption(optionValue!);
  await page.getByRole('button', { name: 'Применить' }).click();
  await page.reload();
  await expect(page.getByTestId('stock-saved-dropdown')).toBeVisible();
});
