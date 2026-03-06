import { expect, test, type Page } from '@playwright/test';

type ApiResult<T> = { ok: boolean; status: number; json: T };

async function apiJson<T>(page: Page, url: string, init?: { method?: string; data?: unknown }): Promise<ApiResult<T>> {
  return page.evaluate(
    async ({ url: endpoint, init: requestInit }) => {
      const response = await fetch(endpoint, {
        method: requestInit?.method ?? 'GET',
        headers: requestInit?.data ? { 'Content-Type': 'application/json' } : undefined,
        body: requestInit?.data ? JSON.stringify(requestInit.data) : undefined,
      });

      const json = (await response.json().catch(() => null)) as T;
      return { ok: response.ok, status: response.status, json };
    },
    { url, init },
  );
}

test('accounting model: OPENING + INVENTORY_APPLY affect stock as specified', async ({ page }) => {
  await page.goto('/stock');
  await expect(page).toHaveURL(/\/(stock|operation)$/);

  const itemsRes = await apiJson<{ items: Array<{ id: string; code: string }> }>(page, '/api/items?active=all');
  expect(itemsRes.ok, `items status=${itemsRes.status}`).toBeTruthy();
  const item = itemsRes.json.items.find((entry) => entry.code === 'ITM-TEST');
  expect(item).toBeTruthy();
  const itemId = item!.id;

  const openingCreateRes = await apiJson<{ session: { id: string } }>(page, '/api/inventory', {
    method: 'POST',
    data: { occurredAt: '2026-03-01', mode: 'OPENING', note: 'E2E OPENING' },
  });
  expect(openingCreateRes.ok).toBeTruthy();
  const openingSessionId = openingCreateRes.json.session.id;

  const openingFillRes = await apiJson(page, `/api/inventory/${openingSessionId}/fill`, {
    method: 'POST',
    data: { scope: 'ITEMS', itemIds: [itemId] },
  });
  expect(openingFillRes.ok).toBeTruthy();

  const openingDetailRes = await apiJson<{ lines: Array<{ id: string }> }>(page, `/api/inventory/${openingSessionId}`);
  expect(openingDetailRes.ok).toBeTruthy();
  const openingLineId = openingDetailRes.json.lines[0]?.id;
  expect(openingLineId).toBeTruthy();

  const openingPatchRes = await apiJson(page, `/api/inventory/${openingSessionId}/lines`, {
    method: 'PATCH',
    data: { updates: [{ lineId: openingLineId, qtyFactInput: 5, apply: true }] },
  });
  expect(openingPatchRes.ok).toBeTruthy();

  const openingApplyRes = await apiJson<{ ok: boolean; transactionId: string; transactionType: string; appliedLines: number }>(page, `/api/inventory/${openingSessionId}/apply`, {
    method: 'POST',
    data: {},
  });
  expect(openingApplyRes.ok).toBeTruthy();
  expect(openingApplyRes.json.ok).toBeTruthy();
  expect(openingApplyRes.json.transactionType).toBe('OPENING');
  expect(openingApplyRes.json.appliedLines).toBe(1);

  const openingTxRes = await apiJson<{ transaction: { type: string } }>(page, `/api/transactions/${openingApplyRes.json.transactionId}`);
  expect(openingTxRes.ok).toBeTruthy();
  expect(openingTxRes.json.transaction.type).toBe('OPENING');

  const regularCreateRes = await apiJson<{ session: { id: string } }>(page, '/api/inventory', {
    method: 'POST',
    data: { occurredAt: '2026-03-06', mode: 'REGULAR', note: 'E2E INV' },
  });
  expect(regularCreateRes.ok).toBeTruthy();
  const regularSessionId = regularCreateRes.json.session.id;

  const regularFillRes = await apiJson(page, `/api/inventory/${regularSessionId}/fill`, {
    method: 'POST',
    data: { scope: 'ITEMS', itemIds: [itemId] },
  });
  expect(regularFillRes.ok).toBeTruthy();

  const regularDetailRes = await apiJson<{ lines: Array<{ id: string }> }>(page, `/api/inventory/${regularSessionId}`);
  expect(regularDetailRes.ok).toBeTruthy();
  const regularLineId = regularDetailRes.json.lines[0]?.id;
  expect(regularLineId).toBeTruthy();

  const regularPatchRes = await apiJson(page, `/api/inventory/${regularSessionId}/lines`, {
    method: 'PATCH',
    data: { updates: [{ lineId: regularLineId, qtyFactInput: 4, apply: true }] },
  });
  expect(regularPatchRes.ok).toBeTruthy();

  const regularApplyRes = await apiJson<{ ok: boolean; transactionId: string; transactionType: string; appliedLines: number }>(page, `/api/inventory/${regularSessionId}/apply`, {
    method: 'POST',
    data: {},
  });
  expect(regularApplyRes.ok).toBeTruthy();
  expect(regularApplyRes.json.ok).toBeTruthy();
  expect(regularApplyRes.json.transactionType).toBe('INVENTORY_APPLY');
  expect(regularApplyRes.json.appliedLines).toBe(1);

  const regularTxRes = await apiJson<{ transaction: { type: string } }>(page, `/api/transactions/${regularApplyRes.json.transactionId}`);
  expect(regularTxRes.ok).toBeTruthy();
  expect(regularTxRes.json.transaction.type).toBe('INVENTORY_APPLY');

  const stockRes = await apiJson<{ items: Array<{ qtyReport: string }> }>(page, '/api/stock?q=ITM-TEST');
  expect(stockRes.ok).toBeTruthy();
  expect(stockRes.json.items[0]?.qtyReport ?? '').toMatch(/4/);
});
