import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const storageStatePath = path.join('playwright', '.auth', 'user.json');

test('authenticate via real login and store storageState', async ({ page }) => {
  const login = process.env.E2E_USER_LOGIN ?? 'e2e_admin';
  const password = process.env.E2E_USER_PASSWORD ?? 'E2EPass12345!';

  await page.goto('/login');
  await page.getByTestId('login-login').fill(login);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();

  await page.waitForURL(/\/(stock|operation)$/);
  await expect(page).toHaveURL(/\/(stock|operation)$/);

  await fs.mkdir(path.dirname(storageStatePath), { recursive: true });
  await page.context().storageState({ path: storageStatePath });
});
