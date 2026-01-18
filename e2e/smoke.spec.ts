import { test, expect } from '@playwright/test';

/**
 * Smoke tests for gastown-dispatch
 * 
 * Quick sanity checks to verify the app is running and functional.
 */

test.describe('Smoke Tests', () => {
  test('App loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to /overview
    await expect(page).toHaveURL(/.*overview/);
    
    // Page should have the app title
    await expect(page.locator('h1')).toContainText('Gas Town');
  });

  test('All main routes are accessible', async ({ page }) => {
    const routes = [
      '/overview',
      '/dispatch',
      '/inbox',
      '/convoys',
      '/beads',
      '/pipeline',
      '/rigs',
      '/agents',
      '/logs',
      '/settings',
      '/onboarding',
    ];

    for (const route of routes) {
      await page.goto(route);
      
      // Wait for navigation to complete
      await page.waitForLoadState('networkidle');
      
      // Verify we're on the correct route
      await expect(page).toHaveURL(new RegExp(route));
      
      // Verify no obvious errors
      const errorText = await page.locator('body').textContent();
      expect(errorText).not.toContain('Error');
      expect(errorText).not.toContain('404');
    }
  });

  test('Navigation works correctly', async ({ page }) => {
    await page.goto('/overview');
    
    // Click on Beads nav item
    await page.getByText('Beads').click();
    await expect(page).toHaveURL(/.*beads/);
    
    // Click on Agents nav item
    await page.getByText('Agents').click();
    await expect(page).toHaveURL(/.*agents/);
    
    // Click back to Overview
    await page.getByText('Overview').click();
    await expect(page).toHaveURL(/.*overview/);
  });

  test('Sidebar is always visible', async ({ page }) => {
    const routes = ['/overview', '/dispatch', '/beads'];
    
    for (const route of routes) {
      await page.goto(route);
      
      const sidebar = page.locator('aside');
      await expect(sidebar).toBeVisible();
      
      // Verify Gas Town branding is present
      await expect(sidebar.locator('h1')).toContainText('Gas Town');
    }
  });
});
