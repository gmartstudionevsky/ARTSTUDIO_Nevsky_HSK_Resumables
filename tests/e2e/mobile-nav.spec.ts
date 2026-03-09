import { expect, test } from '@playwright/test';

test('mobile nav shows admin links under "Ещё" for admin', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/stock');
  await expect(page).toHaveURL(/\/stock$/);

  await page.getByRole('button', { name: 'Ещё' }).click();

  await expect(page.getByRole('link', { name: 'Профиль' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Каталог позиций' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Отчёты' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Админка' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Пользователи' })).toBeVisible();
});
