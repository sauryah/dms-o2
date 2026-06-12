import { test, expect } from '@playwright/test';

test.describe('DMS E2E Smoke Tests', () => {
  let token = '';

  test.beforeAll(async ({ request }) => {
    // Authenticate and get JWT token
    const loginRes = await request.post('http://localhost:8000/api/auth/login/', {
      data: {
        username: 'root',
        password: 'root_pass_1234567890',
      }
    });
    
    if (loginRes.ok()) {
      const loginData = await loginRes.json();
      token = loginData.token;

      // Delete the test die if it exists from a previous test run
      await request.delete('http://localhost:8000/api/dies/R-E2E-1/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Create a clean test die
      const createRes = await request.post('http://localhost:8000/api/dies/', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        data: {
          die_id: 'R-E2E-1',
          die_type: 'ROUND',
          casing: '25x10',
          status: 'AVAILABLE',
          location: 'Rack A - Shelf 3',
          original_size: 2.5,
          current_size: 2.5,
        }
      });
      expect(createRes.ok()).toBeTruthy();

      // Wait a moment for Meilisearch to sync
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  });

  test('unauthenticated search page and login flow', async ({ page }) => {
    // 1. Visit / -> dashboard page renders
    await page.goto('/#/');
    await expect(page.locator('h1')).toContainText('Die Tracking Dashboard');

    // 2. Visit /login -> login form renders
    await page.goto('/#/login');
    await expect(page.locator('h2')).toContainText('Sign In');

    // 3. Login with root credentials -> redirected to /
    await page.fill('input[type="text"]', 'root');
    await page.fill('input[type="password"]', 'root_pass_1234567890');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/#/');

    // Verify navbar shows user's name
    await expect(page.locator('nav')).toContainText('root');

    // 4. Type a die_id on dashboard -> result card appears
    await page.fill('input[placeholder*="Search by Die ID"]', 'R-E2E-1');
    const card = page.locator('h3').filter({ hasText: /^R-E2E-1$/ });
    await expect(card).toBeVisible();

    // 5. Click result -> detail page renders with history table
    await card.click();
    await page.waitForURL('**/#/dies/R-E2E-1');
    await expect(page.locator('h1')).toContainText('R-E2E-1');
    await expect(page.locator('h3:has-text("Change History")')).toBeVisible();

    // 6. Visit /inventory -> inventory page renders
    await page.goto('/#/inventory');
    await expect(page.locator('h1')).toContainText('Die Registry Inventory');

    // 7. Visit /import -> import page renders
    await page.goto('/#/import');
    await expect(page.locator('h1')).toContainText('Bulk Import Dies');

    // 8. Visit /users -> user management renders
    await page.goto('/#/users');
    await expect(page.locator('h1')).toContainText('User Administration');
  });
});
