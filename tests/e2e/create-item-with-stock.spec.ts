import { expect, test, type Page } from '@playwright/test';

type ApiResult<T> = { ok: boolean; status: number; json: T };

async function apiGet<T>(page: Page, url: string): Promise<ApiResult<T>> {
  return page.evaluate(async (endpoint) => {
    const response = await fetch(endpoint);
    const json = (await response.json().catch(() => null)) as T;
    return { ok: response.ok, status: response.status, json };
  }, url);
}

test('catalog: create item with initial stock creates IN transaction and affects stock', async ({ page }) => {
  const itemName = `Позиция E2E ${Date.now()}`;

  await page.goto('/catalog');
  await expect(page).toHaveURL(/\/catalog/);

  const categoriesRes = await apiGet<{ items: Array<{ id: string; name: string }> }>(page, '/api/lookup/categories?active=true');
  expect(categoriesRes.ok, `categories status=${categoriesRes.status}`).toBeTruthy();
  const categoryId = categoriesRes.json.items.find((entry) => entry.name === 'Химия')?.id;
  expect(categoryId).toBeTruthy();

  const expenseArticlesRes = await apiGet<{ items: Array<{ id: string; code: string }> }>(page, '/api/lookup/expense-articles?active=true');
  expect(expenseArticlesRes.ok, `expense-articles status=${expenseArticlesRes.status}`).toBeTruthy();
  const expenseArticleId = expenseArticlesRes.json.items.find((entry) => entry.code === '2.1.4')?.id;
  expect(expenseArticleId).toBeTruthy();

  const purposesRes = await apiGet<{ items: Array<{ id: string; code: string }> }>(page, '/api/lookup/purposes?active=true');
  expect(purposesRes.ok, `purposes status=${purposesRes.status}`).toBeTruthy();
  const purposeId = purposesRes.json.items.find((entry) => entry.code === '2.1.4')?.id;
  expect(purposeId).toBeTruthy();

  await page.getByTestId('catalog-add-item').click();

  await page.getByTestId('item-name').fill(itemName);
  await page.getByTestId('item-category').selectOption(categoryId!);
  await page.getByTestId('item-expense-article').selectOption(expenseArticleId!);
  await page.getByTestId('item-purpose').selectOption(purposeId!);

  const baseUnitSelect = page.getByTestId('item-base-unit');
  await expect(baseUnitSelect).toBeVisible();
  const unitId = await baseUnitSelect.evaluate((el) => {
    const select = el as HTMLSelectElement;
    const option = Array.from(select.options).find((entry) => entry.textContent?.trim() === 'шт');
    return option?.value ?? '';
  });
  expect(unitId).toBeTruthy();

  await page.getByTestId('item-base-unit').selectOption(unitId);
  await page.getByTestId('item-default-input-unit').selectOption(unitId);
  await page.getByTestId('item-report-unit').selectOption(unitId);

  await page.getByTestId('item-initial-toggle').check();
  await page.getByTestId('item-initial-qty').fill('7');
  await page.getByTestId('item-initial-unit').selectOption(unitId);

  await page.getByTestId('item-save').click();
  await page.waitForURL(/\/catalog\/[0-9a-f-]+\?transactionId=[0-9a-f-]+/);
  await expect(page.getByRole('link', { name: 'Открыть историю прихода' })).toBeVisible();

  const stockRes = await apiGet<{ items: Array<{ itemId: string; qtyReport: string }> }>(page, `/api/stock?q=${encodeURIComponent(itemName)}`);
  expect(stockRes.ok).toBeTruthy();
  expect(stockRes.json.items[0]).toBeTruthy();
  expect(stockRes.json.items[0]?.qtyReport ?? '').toMatch(/^7(\.0+)?$/);

  const txRes = await apiGet<{ items: Array<{ id: string; type: string; note: string | null }> }>(page, `/api/transactions?q=${encodeURIComponent(itemName)}`);
  expect(txRes.ok).toBeTruthy();
  const tx = txRes.json.items.find((entry) => entry.type === 'IN' && (entry.note ?? '').includes('Первичное поступление'));
  expect(tx).toBeTruthy();
});
