import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

test('accounting-positions routes contain primary implementations, not item re-exports', () => {
  const top = read('src/app/api/accounting-positions/route.ts');
  const byId = read('src/app/api/accounting-positions/[id]/route.ts');

  assert.equal(top.includes("export { GET, POST } from '@/app/api/items/route';"), false);
  assert.equal(byId.includes("export { GET, PATCH } from '@/app/api/items/[id]/route';"), false);
});

test('items routes are explicit compatibility wrappers over canonical routes', () => {
  const top = read('src/app/api/items/route.ts');
  const byId = read('src/app/api/items/[id]/route.ts');
  const compat = read('src/app/api/items/compat.ts');

  assert.equal(top.includes("from '@/app/api/accounting-positions/route'"), true);
  assert.equal(compat.includes('Deprecation'), true);
  assert.equal(byId.includes("from '@/app/api/accounting-positions/[id]/route'"), true);
});

test('operation/history clients consume canonical accounting-positions payload keys', () => {
  const operationApi = read('src/lib/operation/api.ts');
  const historyApi = read('src/lib/history/api.ts');

  assert.equal(operationApi.includes('payload.accountingPositions ?? payload.items'), false);
  assert.equal(historyApi.includes('return payload.items;'), false);
  assert.equal(operationApi.includes('accountingPositions: ItemOption[]'), true);
  assert.equal(historyApi.includes('accountingPositions: Array<{ id: string; code: string; name: string }>'), true);
});
