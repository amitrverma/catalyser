import { expect, test } from '@playwright/test';

test('shows Supabase login when cloud env is configured', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Sign in to Catalyser' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
});
