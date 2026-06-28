import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:8000';

test.describe('DMS E2E Smoke Tests', () => {
  let token = '';

  test.beforeAll(async ({ request }) => {
    // Authenticate and get JWT token
    const loginRes = await request.post(`${API_URL}/api/auth/login/`, {
      data: {
        username: 'root',
        password: 'root123',
      }
    });
    
    if (loginRes.ok()) {
      const loginData = await loginRes.json();
      token = loginData.token;

      // Delete the test die if it exists from a previous test run
      await request.delete(`${API_URL}/api/dies/R-E2E-1/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Create a clean test die
      const createRes = await request.post(`${API_URL}/api/dies/`, {
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
    await page.fill('input[type="password"]', 'root123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/#/');

    // Verify navbar shows user's name
    await expect(page.locator('nav')).toContainText('root');

    // Verify dashboard page renders
    await expect(page.locator('h1')).toContainText('Die Tracking Dashboard');

    // 4. Type a die_id on dashboard -> result card appears
    await page.fill('input[placeholder*="Search Die ID"]', 'R-E2E-1');
    const card = page.locator('span').filter({ hasText: /^R-E2E-1$/ });
    await expect(card).toBeVisible();

    // Verify range search on dashboard
    await page.click('button:has-text("Filters")');
    await page.selectOption('select:has(option[value="ROUND"])', 'ROUND');
    await page.fill('input[placeholder="Min"]', '3.0'); // Excludes R-E2E-1 (size 2.5)
    await expect(card).not.toBeVisible();
    await page.fill('input[placeholder="Min"]', '1.0'); // Includes R-E2E-1
    await expect(card).toBeVisible();
    
    // Reset dashboard filters
    await page.fill('input[placeholder="Min"]', '');
    await page.selectOption('select:has(option[value="ROUND"])', '');
    await page.click('button:has-text("Filters")');

    // 5. Click result -> detail page renders with history table
    await card.click();
    await page.waitForURL('**/#/dies/R-E2E-1');
    await expect(page.locator('h1')).toContainText('R-E2E-1');
    await expect(page.locator('h3:has-text("Industrial Audit Log")')).toBeVisible();

    // 6. Visit /inventory -> inventory page renders
    await page.goto('/#/inventory');
    await expect(page.locator('h1')).toContainText('Die Registry Inventory');

    // Test range search filters combined with query
    await page.click('button:has-text("Filters")');
    await page.fill('input[placeholder*="Search Die ID"]', '"R-E2E-1"');
    await page.selectOption('select:has(option[value="ROUND"])', 'ROUND');
    
    // Set range that matches R-E2E-1 (size is 2.5)
    await page.fill('input[placeholder="Min"]', '1.0');
    await page.fill('input[placeholder="Max"]', '4.0');
    await expect(page.locator('div').filter({ hasText: /^R-E2E-1$/ })).toBeVisible();

    // Set range that excludes R-E2E-1
    await page.fill('input[placeholder="Min"]', '3.0');
    await expect(page.locator('div').filter({ hasText: /^R-E2E-1$/ })).not.toBeVisible();

    // Reset filters
    await page.fill('input[placeholder="Min"]', '');
    await page.fill('input[placeholder="Max"]', '');
    await page.selectOption('select:has(option[value="ROUND"])', '');
    await page.fill('input[placeholder*="Search Die ID"]', '');
    await page.click('button:has-text("Filters")');

    // 7. Visit /import -> import page renders
    await page.goto('/#/import');
    await expect(page.locator('h1')).toContainText('Bulk Import Dies');

    // 8. Visit /users -> user management renders
    await page.goto('/#/users');
    await expect(page.locator('h1')).toContainText('User Administration');
  });
});
