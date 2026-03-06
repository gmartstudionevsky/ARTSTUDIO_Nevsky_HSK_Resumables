import { expect, test } from '@playwright/test';

test('accounting model: OPENING + INVENTORY_APPLY affect stock as specified', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-login').fill('e2e_admin');
  await page.getByTestId('login-password').fill('E2EPass12345!');
  await page.getByTestId('login-submit').click();
  await page.waitForURL(/\/(stock|operation)$/);

  const itemsRes = await page.request.get('/api/items?q=ITM-TEST&active=true');
  expect(itemsRes.ok()).toBeTruthy();
  const itemsPayload = (await itemsRes.json()) as { items: Array<{ id: string; code: string }> };
  const item = itemsPayload.items.find((entry) => entry.code === 'ITM-TEST');
  expect(item).toBeTruthy();
  const itemId = item!.id;

  const openingCreateRes = await page.request.post('/api/inventory', {
    data: { occurredAt: '2026-03-01', mode: 'OPENING', note: 'E2E OPENING' },
  });
  expect(openingCreateRes.ok()).toBeTruthy();
  const openingSessionId = ((await openingCreateRes.json()) as { session: { id: string } }).session.id;

  const openingFillRes = await page.request.post(`/api/inventory/${openingSessionId}/fill`, {
    data: { scope: 'ITEMS', itemIds: [itemId] },
  });
  expect(openingFillRes.ok()).toBeTruthy();

  const openingDetailRes = await page.request.get(`/api/inventory/${openingSessionId}`);
  expect(openingDetailRes.ok()).toBeTruthy();
  const openingDetail = (await openingDetailRes.json()) as { lines: Array<{ id: string }> };
  const openingLineId = openingDetail.lines[0]?.id;
  expect(openingLineId).toBeTruthy();

  const openingPatchRes = await page.request.patch(`/api/inventory/${openingSessionId}/lines`, {
    data: { updates: [{ lineId: openingLineId, qtyFactInput: 5, apply: true }] },
  });
  expect(openingPatchRes.ok()).toBeTruthy();

  const openingApplyRes = await page.request.post(`/api/inventory/${openingSessionId}/apply`, {
    data: {},
  });
  expect(openingApplyRes.ok()).toBeTruthy();
  const openingApplyPayload = (await openingApplyRes.json()) as { ok: boolean; transactionId: string; transactionType: string; appliedLines: number };
  expect(openingApplyPayload.ok).toBeTruthy();
  expect(openingApplyPayload.transactionType).toBe('OPENING');
  expect(openingApplyPayload.appliedLines).toBe(1);

  const openingTxRes = await page.request.get(`/api/transactions/${openingApplyPayload.transactionId}`);
  expect(openingTxRes.ok()).toBeTruthy();
  const openingTxPayload = (await openingTxRes.json()) as { transaction: { type: string } };
  expect(openingTxPayload.transaction.type).toBe('OPENING');

  const regularCreateRes = await page.request.post('/api/inventory', {
    data: { occurredAt: '2026-03-06', mode: 'REGULAR', note: 'E2E INV' },
  });
  expect(regularCreateRes.ok()).toBeTruthy();
  const regularSessionId = ((await regularCreateRes.json()) as { session: { id: string } }).session.id;

  const regularFillRes = await page.request.post(`/api/inventory/${regularSessionId}/fill`, {
    data: { scope: 'ITEMS', itemIds: [itemId] },
  });
  expect(regularFillRes.ok()).toBeTruthy();

  const regularDetailRes = await page.request.get(`/api/inventory/${regularSessionId}`);
  expect(regularDetailRes.ok()).toBeTruthy();
  const regularDetail = (await regularDetailRes.json()) as { lines: Array<{ id: string }> };
  const regularLineId = regularDetail.lines[0]?.id;
  expect(regularLineId).toBeTruthy();

  const regularPatchRes = await page.request.patch(`/api/inventory/${regularSessionId}/lines`, {
    data: { updates: [{ lineId: regularLineId, qtyFactInput: 4, apply: true }] },
  });
  expect(regularPatchRes.ok()).toBeTruthy();

  const regularApplyRes = await page.request.post(`/api/inventory/${regularSessionId}/apply`, {
    data: {},
  });
  expect(regularApplyRes.ok()).toBeTruthy();
  const regularApplyPayload = (await regularApplyRes.json()) as { ok: boolean; transactionId: string; transactionType: string; appliedLines: number };
  expect(regularApplyPayload.ok).toBeTruthy();
  expect(regularApplyPayload.transactionType).toBe('INVENTORY_APPLY');
  expect(regularApplyPayload.appliedLines).toBe(1);

  const regularTxRes = await page.request.get(`/api/transactions/${regularApplyPayload.transactionId}`);
  expect(regularTxRes.ok()).toBeTruthy();
  const regularTxPayload = (await regularTxRes.json()) as { transaction: { type: string } };
  expect(regularTxPayload.transaction.type).toBe('INVENTORY_APPLY');

  const stockRes = await page.request.get('/api/stock?q=ITM-TEST');
  expect(stockRes.ok()).toBeTruthy();
  const stockPayload = (await stockRes.json()) as { items: Array<{ qtyReport: string }> };
  expect(stockPayload.items[0]?.qtyReport ?? '').toMatch(/4/);
});
