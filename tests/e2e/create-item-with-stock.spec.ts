import { expect, test } from '@playwright/test';

test('catalog: create item with initial stock creates IN transaction and affects stock', async ({ page }) => {
  const itemName = `Позиция E2E ${Date.now()}`;

  await page.goto('/login');
  await page.getByTestId('login-login').fill('e2e_admin');
  await page.getByTestId('login-password').fill('E2EPass12345!');
  await page.getByTestId('login-submit').click();
  await page.waitForURL(/\/(stock|operation)$/);

  const categoriesRes = await page.request.get('/api/lookup/categories?q=Химия');
  expect(categoriesRes.ok()).toBeTruthy();
  const categories = (await categoriesRes.json()) as { items: Array<{ id: string; name: string }> };
  const categoryId = categories.items.find((entry) => entry.name === 'Химия')?.id;
  expect(categoryId).toBeTruthy();

  const expenseArticlesRes = await page.request.get('/api/lookup/expense-articles?q=2.1.4');
  expect(expenseArticlesRes.ok()).toBeTruthy();
  const expenseArticles = (await expenseArticlesRes.json()) as { items: Array<{ id: string; code: string }> };
  const expenseArticleId = expenseArticles.items.find((entry) => entry.code === '2.1.4')?.id;
  expect(expenseArticleId).toBeTruthy();

  const purposesRes = await page.request.get('/api/lookup/purposes?q=2.1.4');
  expect(purposesRes.ok()).toBeTruthy();
  const purposes = (await purposesRes.json()) as { items: Array<{ id: string; code: string }> };
  const purposeId = purposes.items.find((entry) => entry.code === '2.1.4')?.id;
  expect(purposeId).toBeTruthy();

  await page.goto('/catalog');
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

  const stockRes = await page.request.get(`/api/stock?q=${encodeURIComponent(itemName)}`);
  expect(stockRes.ok()).toBeTruthy();
  const stockPayload = (await stockRes.json()) as { items: Array<{ itemId: string; qtyReport: string }> };
  expect(stockPayload.items[0]).toBeTruthy();
  expect(stockPayload.items[0]?.qtyReport ?? '').toMatch(/^7(\.0+)?$/);

  const txRes = await page.request.get(`/api/transactions?q=${encodeURIComponent(itemName)}`);
  expect(txRes.ok()).toBeTruthy();
  const txPayload = (await txRes.json()) as { items: Array<{ id: string; type: string; note: string | null }> };
  const tx = txPayload.items.find((entry) => entry.type === 'IN' && (entry.note ?? '').includes('Первичное поступление'));
  expect(tx).toBeTruthy();
});
