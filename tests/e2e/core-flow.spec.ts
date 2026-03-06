import { expect, test } from '@playwright/test';

import { setupTestData, type TestData } from './setupTestData';

let testData: TestData;

test.beforeAll(async () => {
  testData = await setupTestData();
});

test('core flow: intake operation -> stock check', async ({ page }) => {
  await page.goto('/stock');
  await expect(page).toHaveURL(/\/(stock|operation)$/);

  const initialStockPayload = await page.evaluate(async (name) => {
    const response = await fetch(`/api/stock?q=${encodeURIComponent(name)}`);
    if (!response.ok) {
      throw new Error(`stock bootstrap failed: ${response.status}`);
    }

    return (await response.json()) as { items: Array<{ itemId: string; qtyReport: string }> };
  }, testData.itemName);
  const initialQtyRaw = initialStockPayload.items.find((entry) => entry.itemId === testData.itemId)?.qtyReport ?? '0';
  const initialQty = Number(initialQtyRaw.replace(',', '.'));

  await page.goto('/operation');

  await page.getByTestId('op-tab-in').click();
  await page.getByTestId('op-intake-single').click();
  await page.getByTestId('op-header-purpose').selectOption(testData.purposeId);

  await page.getByTestId('op-item-search').fill(testData.itemName);
  await page.getByTestId('op-search-item').click();
  await page.getByTestId(`op-item-option-${testData.itemId}`).waitFor({ state: 'attached' });
  await page.getByTestId('op-item-select').selectOption(testData.itemId);

  await page.getByTestId('op-qty').fill('10');
  await page.getByTestId('op-unit').selectOption({ label: 'шт' });
  await page.getByTestId('op-add-line').click();
  await page.getByTestId('op-save').click();

  await expect(page.getByTestId('op-result')).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId('op-result-lines')).toContainText(testData.itemName);

  await page.goto('/stock');
  await expect(page.getByTestId(`stock-item-${testData.itemId}`)).toBeVisible({ timeout: 30000 });
  await expect.poll(async () => {
    const payload = await page.evaluate(async (name) => {
      const response = await fetch(`/api/stock?q=${encodeURIComponent(name)}`);
      if (!response.ok) return null;
      return (await response.json()) as { items: Array<{ itemId: string; qtyReport: string }> };
    }, testData.itemName);
    if (!payload) return Number.NaN;
    const qtyRaw = payload.items.find((entry) => entry.itemId === testData.itemId)?.qtyReport ?? '0';
    return Number(qtyRaw.replace(',', '.'));
  }, { timeout: 30000 }).toBeCloseTo(initialQty + 10, 6);
});
