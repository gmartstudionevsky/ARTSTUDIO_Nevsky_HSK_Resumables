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

  const meRes = await apiGet<{ user?: { id: string; login: string; role: string } }>(page, '/api/auth/me');
  console.info('[e2e][create-item] /api/auth/me', meRes);
  expect(meRes.ok).toBeTruthy();
  expect(meRes.json.user?.role === 'ADMIN' || meRes.json.user?.role === 'MANAGER').toBeTruthy();

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
  const sectionId = purposesRes.json.items.find((entry) => entry.code === '2.1.4')?.id;
  expect(sectionId).toBeTruthy();

  const addButton = page.getByTestId('catalog-add-item');
  try {
    await addButton.waitFor({ state: 'visible', timeout: 10_000 });
  } catch (error) {
    const bodyHtml = await page.locator('body').innerHTML();
    console.error('[e2e][create-item] catalog-add-item missing', {
      url: page.url(),
      bodyExcerpt: bodyHtml.slice(0, 1500),
      role: meRes.json.user?.role ?? null,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
  await addButton.click();

  await page.getByTestId('item-name').fill(itemName);
  await page.getByTestId('item-category').selectOption(categoryId!);
  await page.getByTestId('item-expense-article').selectOption(expenseArticleId!);
  await page.getByTestId('item-section').selectOption(sectionId!);

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
  await expect(page.getByText('Не удалось создать позицию')).toHaveCount(0);
  await page.waitForURL(/\/catalog\/[0-9a-f-]+\?transactionId=[0-9a-f-]+/);
  await expect(page.getByRole('link', { name: 'Открыть историю прихода' })).toBeVisible();

  const stockRes = await apiGet<{ items: Array<{ accountingPositionId: string; qtyReport: string }> }>(page, `/api/stock?q=${encodeURIComponent(itemName)}`);
  expect(stockRes.ok).toBeTruthy();
  expect(stockRes.json.items[0]).toBeTruthy();
  expect(stockRes.json.items[0]?.qtyReport ?? '').toMatch(/^7(\.0+)?$/);

  const txRes = await apiGet<{ items: Array<{ id: string; type: string; note: string | null }> }>(page, `/api/transactions?q=${encodeURIComponent(itemName)}`);
  expect(txRes.ok).toBeTruthy();
  const tx = txRes.json.items.find((entry) => entry.type === 'IN' && (entry.note ?? '').includes('Первичное поступление'));
  expect(tx).toBeTruthy();
});
