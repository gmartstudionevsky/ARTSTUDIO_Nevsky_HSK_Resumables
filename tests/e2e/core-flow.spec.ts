import { expect, test } from '@playwright/test';

import { setupTestData, type TestData } from './setupTestData';

let testData: TestData;

test.beforeAll(async () => {
  testData = await setupTestData();
});

test('core flow: intake operation -> stock check', async ({ page }) => {
  await page.goto('/stock');
  await expect(page).toHaveURL(/\/stock$/);

  const initialStockPayload = await page.evaluate(async (name) => {
    const response = await fetch(`/api/stock?q=${encodeURIComponent(name)}`);
    if (!response.ok) {
      throw new Error(`stock bootstrap failed: ${response.status}`);
    }

    return (await response.json()) as { items: Array<{ accountingPositionId: string; qtyReport: string }> };
  }, testData.accountingPositionName);
  const initialQtyRaw = initialStockPayload.items.find((entry) => entry.accountingPositionId === testData.accountingPositionId)?.qtyReport ?? '0';
  const initialQty = Number(initialQtyRaw.replace(',', '.'));

  await page.goto('/movements');

  await page.getByTestId('op-tab-in').click();
  await page.getByTestId('op-intake-single').click();
  await page.getByTestId('op-header-section').selectOption(testData.sectionId);

  await page.getByTestId('op-item-search').fill(testData.accountingPositionName);
  await page.getByTestId('op-search-item').click();
  await page.getByTestId(`op-qty-${testData.accountingPositionId}`).fill('10');
  const unitSelect = page.getByTestId(`op-unit-${testData.accountingPositionId}`);
  if (await unitSelect.count()) {
    await unitSelect.selectOption({ label: 'шт' });
  }
  await page.getByTestId(`op-row-submit-${testData.accountingPositionId}`).click();

  await expect(page.getByTestId('op-result')).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId('op-result-lines')).toContainText(testData.accountingPositionName);

  await page.goto('/stock');
  await expect(page.getByTestId(`stock-item-${testData.accountingPositionId}`)).toBeVisible({ timeout: 30000 });
  await expect.poll(async () => {
    const payload = await page.evaluate(async (name) => {
      const response = await fetch(`/api/stock?q=${encodeURIComponent(name)}`);
      if (!response.ok) return null;
      return (await response.json()) as { items: Array<{ accountingPositionId: string; qtyReport: string }> };
    }, testData.accountingPositionName);
    if (!payload) return Number.NaN;
    const qtyRaw = payload.items.find((entry) => entry.accountingPositionId === testData.accountingPositionId)?.qtyReport ?? '0';
    return Number(qtyRaw.replace(',', '.'));
  }, { timeout: 30000 }).toBeCloseTo(initialQty + 10, 6);
});
