import { expect, test } from '@playwright/test';

import { setupTestData, type TestData } from './setupTestData';

let testData: TestData;

test.beforeAll(async () => {
  testData = await setupTestData();
});

test('core flow: login -> change password -> intake operation -> stock check', async ({ page }) => {
  await page.goto('/stock');
  await expect(page.getByTestId('login-login')).toBeVisible();

  await page.getByTestId('login-login').fill('admin');
  await page.getByTestId('login-password').fill('ChangeMe123!');
  await page.getByTestId('login-submit').click();

  await expect(page.getByTestId('cp-current')).toBeVisible({ timeout: 20000 });
  await page.getByTestId('cp-current').fill('ChangeMe123!');
  await page.getByTestId('cp-new').fill('NewPass12345!');
  await page.getByTestId('cp-confirm').fill('NewPass12345!');
  await page.getByTestId('cp-submit').click();

  await expect
    .poll(async () => page.url(), { timeout: 20000 })
    .toMatch(/\/(stock|operation)$/);

  await page.goto('/operation');

  await page.getByTestId('op-tab-in').click();
  await page.getByTestId('op-intake-single').click();
  await page.getByTestId('op-header-purpose').selectOption(testData.purposeId);

  await page.getByTestId('op-item-search').fill('Тестовая позиция');
  await page.getByTestId('op-search-item').click();
  await page.getByTestId(`op-item-option-${testData.itemId}`).waitFor({ state: 'attached' });
  await page.getByTestId('op-item-select').selectOption(testData.itemId);

  await page.getByTestId('op-qty').fill('10');
  await page.getByTestId('op-unit').selectOption({ label: 'шт' });
  await page.getByTestId('op-add-line').click();
  await page.getByTestId('op-save').click();

  await expect(page.getByTestId('op-result')).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId('op-result-lines')).toContainText('Тестовая позиция');

  await page.goto('/stock');
  await expect(page.getByTestId(`stock-item-${testData.itemId}`)).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId(`stock-qty-${testData.itemId}`)).toHaveText(/10/, { timeout: 30000 });
});
