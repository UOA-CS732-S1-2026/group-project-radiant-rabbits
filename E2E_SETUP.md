# E2E Smoke Tests Setup Guide

This guide explains how to set up and run E2E smoke tests for CI without needing to automate GitHub's login flow.

## How It Works

1. **Test Mode Auth**: When `E2E_TEST_MODE=true`, NextAuth provides a fake "Test Sign In" button that returns a fixed test user instantly
2. **No GitHub Login**: The test skips GitHub's OAuth entirely in test mode, making tests fast and reliable
3. **Real Auth in Production**: GitHub OAuth still works normally when `E2E_TEST_MODE` is not set

## Local Testing

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

Create `.env.local` with your test credentials:

```bash
# Copy from .env.test and update with your actual secrets
cp .env.test .env.local
```

Update `.env.local`:
```
AUTH_SECRET=your-secret-here
AUTH_GITHUB_ID=your-github-app-id
AUTH_GITHUB_SECRET=your-github-app-secret
MONGODB_URL=mongodb://localhost:27017/your-db
E2E_TEST_MODE=true
```

### 3. Start Your App

```bash
npm run dev
# App runs on http://localhost:3000
```

### 4. Run Tests

In a new terminal:

```bash
# Run headless
npm run test:e2e

# Run with UI (see tests running)
npm run test:e2e:ui

# Run specific test file
npx playwright test smoke.spec.ts

# Run single test
npx playwright test smoke.spec.ts -g "should login with test credentials"
```

## What the Smoke Tests Check

1. ✅ Can login with "Test Sign In" button (no GitHub page)
2. ✅ Redirects to `/join-create-switch-group` after login
3. ✅ Can select or create a group
4. ✅ Can reach `/dashboard`
5. ✅ Page structure loads correctly

## GitHub Actions Setup

### 1. Add Secrets to Repository

Go to **Settings → Secrets and variables → Actions** and add:

- `AUTH_SECRET`: Your NextAuth secret
- `AUTH_GITHUB_ID`: GitHub OAuth app ID (even if not used in tests)
- `AUTH_GITHUB_SECRET`: GitHub OAuth app secret (even if not used in tests)

### 2. Workflow Runs Automatically

The `.github/workflows/e2e.yml` workflow runs on:
- Push to `main` or `dev`
- Pull requests to `main` or `dev`

It:
1. Checks out code
2. Installs dependencies
3. Builds the app
4. Installs Playwright browsers
5. Starts MongoDB service
6. Runs tests with `E2E_TEST_MODE=true`
7. Uploads test report as artifact

### 3. View Results

- **Green check**: All tests passed
- **Red X**: Tests failed (check the artifact report)
- **Logs**: See detailed output in the Actions tab

## Environment Variables Explained

| Variable | Required | Purpose |
|----------|----------|---------|
| `AUTH_SECRET` | ✅ | NextAuth secret key |
| `AUTH_GITHUB_ID` | ✅ | GitHub OAuth app ID |
| `AUTH_GITHUB_SECRET` | ✅ | GitHub OAuth app secret |
| `MONGODB_URL` | ✅ | MongoDB connection string |
| `E2E_TEST_MODE` | ✅ | `true` to enable test credentials |
| `E2E_TEST_USER_ID` | ❌ | Optional test user ID (defaults to `smoke-user-1`) |
| `CI` | Auto | Set by GitHub Actions |

## Customizing Tests

### Add More Tests

Create new test files in `src/e2e/`:

```typescript
// src/e2e/dashboard.spec.ts
import { test, expect } from "@playwright/test";

test("should display dashboard stats", async ({ page }) => {
  await page.goto("/");
  // ... login ...
  await page.goto("/dashboard");
  
  const stats = page.locator('[data-testid="stats"]');
  await expect(stats).toBeVisible();
});
```

### Improve Selectors

Add `data-testid` attributes to your React components for reliable test selection:

```tsx
// In your React components
<button data-testid="sign-in-button">Test Sign In</button>
<div data-testid="group-card">{groupName}</div>
```

## Troubleshooting

### Tests Can't Find "Test Sign In" Button

- Ensure `E2E_TEST_MODE=true` in your `.env.local`
- Check that the button is actually rendered (view page in browser)
- Update selector in test if button text is different

### Tests Timeout at MongoDB

- Make sure MongoDB is running locally: `mongosh`
- Or use MongoDB Atlas cloud instance: `MONGODB_URL=mongodb+srv://...`

### Tests Fail in CI but Pass Locally

- Check secrets are set in GitHub Actions settings
- Verify `MONGODB_URL` points to correct database
- Check CI logs for detailed error messages

### Playwright Can't Connect to App

- Ensure app is running on `http://localhost:3000`
- Check for port conflicts: `lsof -i :3000` (macOS/Linux)
- Adjust `webServer` in `playwright.config.ts` if needed

## What's Next

Once smoke tests are stable:
1. Add more comprehensive E2E scenarios
2. Test user workflows (create sprint, assign tasks, etc.)
3. Add performance benchmarks
4. Set up notifications for test failures
