import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:8000';

test.describe('DMS E2E New Flows Tests', () => {
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

      // Create a clean test die with no location (to appear in unassigned sidebar)
      await request.delete(`${API_URL}/api/dies/R-UNASSIGNED-1/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const createRes = await request.post(`${API_URL}/api/dies/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        data: {
          die_id: 'R-UNASSIGNED-1',
          die_type: 'ROUND',
          casing: '25x10',
          status: 'AVAILABLE',
          location: '', // empty -> unassigned
          original_size: 2.5,
          current_size: 2.5,
        }
      });
      expect(createRes.ok()).toBeTruthy();

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });

  test.beforeEach(async ({ page }) => {
    // Perform standard login before each test
    await page.goto('/#/login');
    await page.fill('input[type="text"]', 'root');
    await page.fill('input[type="password"]', 'root123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/#/');
    // Crucial: Wait for session to be fully loaded and navbar to show username
    await expect(page.locator('nav')).toContainText('root');
  });

  test('1. Import dry-run flow', async ({ page }) => {
    await page.goto('/#/import');
    await expect(page.locator('h1')).toContainText('Bulk Import Dies');

    // Create a temporary CSV content and upload it
    const csvContent = "die_id,die_type,casing,status,location,remarks,original_size,current_size\n" +
                       "R-IMPORT-FLOW-1,ROUND,casing1,AVAILABLE,Rack A,,2.5,2.5\n";

    const buffer = Buffer.from(csvContent, 'utf-8');
    const filePayload = {
      name: 'import_flow.csv',
      mimeType: 'text/csv',
      buffer: buffer,
    };

    // Upload the file
    await page.setInputFiles('#file-upload', filePayload);
    await expect(page.locator('span').filter({ hasText: 'import_flow.csv' })).toBeVisible();

    // Click Preview (Dry Run)
    await page.click('button:has-text("Preview (Dry Run)")');

    // Expect the preview modal to open
    await expect(page.locator('h2')).toContainText('Import Preview (Dry Run)');
    await expect(page.locator('button:has-text("Confirm Import")')).toBeVisible();

    // Click Confirm Import
    await page.click('button:has-text("Confirm Import")');

    // Expect status message showing success specifically (using regex to match created or updated counts dynamically)
    await expect(page.getByText(/Import complete: \d+ created, \d+ updated, \d+ skipped/)).toBeVisible();
  });

  test('2. History page navigation and filter', async ({ page }) => {
    await page.goto('/#/history');
    await expect(page.locator('h1')).toContainText('Audit Trail');

    // Filter by field or search
    await page.fill('input[placeholder="Search die id..."]', 'R-UNASSIGNED-1');
    
    // Expect either the table to load or the empty state message to be shown
    const table = page.locator('table');
    const emptyState = page.getByText('No audit log records found');
    await expect(table.or(emptyState)).toBeVisible({ timeout: 10000 });
  });

  test('3. Rack grid unassigned sidebar shows unmapped die', async ({ page }) => {
    await page.goto('/#/inventory');
    await expect(page.locator('h1')).toContainText('Die Registry Inventory');

    // Ensure we are viewing map/grid view (not list view)
    const mapButton = page.locator('button:has-text("Map Layout")');
    if (await mapButton.isVisible()) {
      await mapButton.click();
    }

    // Expect sidebar to list R-UNASSIGNED-1 under unmapped dies
    await expect(page.locator('div').filter({ hasText: /^R-UNASSIGNED-1$/ }).first()).toBeVisible();
  });

  test('4. Inline status toggle updates status', async ({ page }) => {
    await page.goto('/#/inventory');
    
    // Ensure we are in list view
    const listButton = page.locator('button:has-text("Registry List")');
    if (await listButton.isVisible()) {
      await listButton.click();
    }

    // Search for R-UNASSIGNED-1
    await page.click('button:has-text("Filters")');
    await page.fill('input[placeholder*="Search Die ID"]', 'R-UNASSIGNED-1');
    await page.waitForTimeout(500);

    // Locate the select dropdown for status specifically (using .font-mono class)
    const statusSelect = page.locator('select.font-mono').first();
    await expect(statusSelect).toBeVisible();

    // Change status from AVAILABLE to RUNNING
    await statusSelect.selectOption('RUNNING');

    // Wait for query update
    await page.waitForTimeout(1000);

    // Verify it updated without reload (value remains RUNNING)
    await expect(statusSelect).toHaveValue('RUNNING');
  });

  test('5. Command palette navigation', async ({ page }) => {
    // Press Ctrl+K
    await page.keyboard.press('Control+k');

    // Expect command palette to open
    const input = page.locator('input[placeholder*="Type a command or die ID"]');
    await expect(input).toBeVisible();

    // Type die ID
    await input.fill('R-UNASSIGNED-1');
    await page.waitForTimeout(1000);

    // Locate and click specifically the "Go to Die" navigation action
    const resultItem = page.locator('div.cursor-pointer:has-text("Go to Die: R-UNASSIGNED-1")').first();
    await expect(resultItem).toBeVisible();
    await resultItem.click();

    // Wait for detail page navigation
    await page.waitForURL('**/#/dies/R-UNASSIGNED-1');
    await expect(page.locator('h1')).toContainText('R-UNASSIGNED-1');
  });
});
