# E2E Testing with Playwright

This directory contains end-to-end tests for the gastown-dispatch UI using Playwright.

## Test Types

### Screenshot Tests (`screenshots.spec.ts`)
Visual regression tests that capture screenshots of each page and compare them to baseline images. These tests help detect unintended visual changes.

**Features:**
- Full-page screenshots for all main routes
- Component-level screenshots (sidebar, banner)
- Responsive layout testing (mobile, tablet, desktop)
- Disabled animations for consistent snapshots

### Smoke Tests (`smoke.spec.ts`)
Quick sanity checks to verify basic functionality:
- App loads successfully
- All routes are accessible
- Navigation works correctly
- Layout elements are visible

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run with UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Debug tests
```bash
npm run test:e2e:debug
```

### Update screenshot baselines
After intentional UI changes, update the baseline screenshots:
```bash
npm run test:e2e:update
```

## First Run

On the first run, Playwright will:
1. Start the dev servers (backend + frontend)
2. Run all tests
3. Capture baseline screenshots in `e2e/__screenshots__/`

All subsequent runs will compare against these baselines.

## How Screenshot Tests Work

1. **Baseline Creation**: First run captures reference screenshots
2. **Comparison**: Subsequent runs compare current screenshots to baselines
3. **Failure**: If differences exceed threshold, test fails and shows diff
4. **Update**: Use `--update-snapshots` flag to accept changes as new baseline

## Screenshot Locations

- Baseline screenshots: `e2e/__screenshots__/<test-name>/<browser>/<screenshot-name>.png`
- Failed comparison diffs: `test-results/` directory

## CI/CD Integration

The tests are configured to:
- Run in headless mode on CI
- Retry failed tests (2 retries on CI)
- Run tests sequentially on CI (workers: 1)
- Generate HTML report

## Best Practices

1. **Wait for stability**: Tests use `networkidle` to ensure pages are fully loaded
2. **Disable animations**: Screenshots disable animations for consistency
3. **Consistent viewport**: Tests use fixed viewport (1280x720) for comparison
4. **Full-page captures**: Screenshots capture entire page, not just viewport
5. **Update intentionally**: Only update baselines when UI changes are intentional

## Troubleshooting

### Tests fail locally but screenshots look identical
- Ensure you're running on the same OS (Linux/Mac differences can affect rendering)
- Check that the dev server is fully started before tests run
- Verify viewport size matches the baseline

### Tests are flaky
- Add explicit waits for dynamic content
- Disable animations and transitions
- Use `waitForLoadState('networkidle')` before screenshots

### Need to debug a specific test
```bash
npx playwright test screenshots.spec.ts --debug
```

## Adding New Tests

To add new screenshot tests:

1. Add a new test in `screenshots.spec.ts`:
```typescript
test('New page renders correctly', async ({ page }) => {
  await page.goto('/new-page');
  await page.waitForLoadState('networkidle');
  
  await expect(page).toHaveScreenshot('new-page.png', {
    fullPage: true,
    animations: 'disabled',
  });
});
```

2. Run tests with `--update-snapshots` to create baseline
3. Commit both test code and baseline screenshots

## Configuration

See `playwright.config.ts` in the project root for configuration details.
