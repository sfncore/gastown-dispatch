import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for gastown-dispatch screenshot testing
 * 
 * This config sets up visual regression testing for the web UI.
 * Screenshots are compared pixel-by-pixel to detect visual changes.
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',
  
  // Timeout for each test (30 seconds)
  timeout: 30000,
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html'],
    ['list']
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for the app (frontend dev server)
    baseURL: 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Screenshot settings
    screenshot: 'only-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use consistent viewport for screenshot comparison
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  // Run dev server before starting tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes to start the dev server
  },
});
