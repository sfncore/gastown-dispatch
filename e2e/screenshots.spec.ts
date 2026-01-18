import { test, expect } from '@playwright/test';

/**
 * Screenshot tests for gastown-dispatch UI
 * 
 * These tests capture visual snapshots of each page to detect unintended UI changes.
 * The first run will capture baseline screenshots. Subsequent runs compare against them.
 * 
 * To update baselines after intentional changes: npx playwright test --update-snapshots
 */

test.describe('Page Screenshots', () => {
  // Increase timeout for screenshot tests as they may need to wait for rendering
  test.setTimeout(60000);

  test('Overview page renders correctly', async ({ page }) => {
    await page.goto('/overview');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Take screenshot and compare
    await expect(page).toHaveScreenshot('overview.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Mayor (Dispatch) page renders correctly', async ({ page }) => {
    await page.goto('/dispatch');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('dispatch.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Inbox page renders correctly', async ({ page }) => {
    await page.goto('/inbox');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('inbox.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Convoys page renders correctly', async ({ page }) => {
    await page.goto('/convoys');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('convoys.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Beads page renders correctly', async ({ page }) => {
    await page.goto('/beads');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('beads.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Pipeline page renders correctly', async ({ page }) => {
    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('pipeline.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Rigs page renders correctly', async ({ page }) => {
    await page.goto('/rigs');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('rigs.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Agents page renders correctly', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('agents.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Logs page renders correctly', async ({ page }) => {
    await page.goto('/logs');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('logs.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Settings page renders correctly', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('settings.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Onboarding page renders correctly', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('onboarding.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Navigation and Layout', () => {
  test('Sidebar navigation is visible', async ({ page }) => {
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');
    
    // Check that sidebar contains expected navigation items
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    
    // Verify key nav items are present
    await expect(page.getByText('Overview')).toBeVisible();
    await expect(page.getByText('Mayor')).toBeVisible();
    await expect(page.getByText('Inbox')).toBeVisible();
    await expect(page.getByText('Convoys')).toBeVisible();
    await expect(page.getByText('Beads')).toBeVisible();
    await expect(page.getByText('Pipeline')).toBeVisible();
    
    // Take screenshot of sidebar
    await expect(sidebar).toHaveScreenshot('sidebar.png', {
      animations: 'disabled',
    });
  });

  test('Town banner is visible', async ({ page }) => {
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');
    
    // Screenshot of the top banner area
    const banner = page.locator('header, [class*="banner"]').first();
    if (await banner.count() > 0) {
      await expect(banner).toHaveScreenshot('town-banner.png', {
        animations: 'disabled',
      });
    }
  });
});

test.describe('Responsive Layout', () => {
  test('Mobile viewport renders correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('overview-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Tablet viewport renders correctly', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('overview-tablet.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});
