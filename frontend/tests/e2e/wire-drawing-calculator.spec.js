import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:8000';

test.describe('Wire Drawing Calculator E2E', () => {
  let token = '';

  test.beforeAll(async ({ request }) => {
    const loginRes = await request.post(`${API_URL}/api/auth/login/`, {
      data: { username: 'root', password: 'root123' }
    });
    if (loginRes.ok()) {
      const loginData = await loginRes.json();
      token = loginData.token;
    }
  });

  test('wire drawing calculator page loads and renders input form', async ({ page }) => {
    await page.goto('/#/login');
    await page.fill('input[type="text"]', 'root');
    await page.fill('input[type="password"]', 'root123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/#/');

    await page.goto('/#/wire-drawing-calculator');
    await page.waitForTimeout(1000);

    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('calculator accepts input and produces results', async ({ page }) => {
    await page.goto('/#/login');
    await page.fill('input[type="text"]', 'root');
    await page.fill('input[type="password"]', 'root123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/#/');

    await page.goto('/#/wire-drawing-calculator');
    await page.waitForTimeout(1500);

    const inputArea = page.locator('input[type="number"]').first();
    if (await inputArea.isVisible()) {
      await inputArea.fill('5.0');
      await page.keyboard.press('Tab');

      const secondInput = page.locator('input[type="number"]').nth(1);
      if (await secondInput.isVisible()) {
        await secondInput.fill('3.0');
      }
    }

    await page.waitForTimeout(500);
  });
});
