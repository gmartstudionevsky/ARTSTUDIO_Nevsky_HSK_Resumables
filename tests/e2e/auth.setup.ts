import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

import { ensureE2EAdminUser } from './ensureE2EUser';

const storageStatePath = path.join('playwright', '.auth', 'user.json');

test('authenticate via real login and store storageState', async ({ page }) => {
  const login = process.env.E2E_USER_LOGIN ?? 'e2e_admin';
  const password = process.env.E2E_USER_PASSWORD ?? 'E2EPass12345!';

  const ensuredUser = await ensureE2EAdminUser(login, password);
  console.info('[e2e][auth.setup] ensured user', ensuredUser);

  await page.goto('/login');
  await page.getByTestId('login-login').fill(login);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();

  await page.waitForURL(/\/(stock|operation|movements)$/);
  await expect(page).toHaveURL(/\/(stock|operation|movements)$/);

  const meResponse = await page.request.get('/api/auth/me');
  const mePayload = (await meResponse.json().catch(() => null)) as { user?: { id: string; login: string; role: string; isActive: boolean } } | null;
  console.info('[e2e][auth.setup] /api/auth/me', { status: meResponse.status(), user: mePayload?.user ?? null });
  expect(mePayload?.user?.role === 'ADMIN' || mePayload?.user?.role === 'MANAGER').toBeTruthy();

  await fs.mkdir(path.dirname(storageStatePath), { recursive: true });
  await page.context().storageState({ path: storageStatePath });
});
