// E2E Tests for Authentication Flow
// Run: npx playwright test

const { test, expect } = require('@playwright/test');

test.describe('Authentication', () => {
  test('should show sign-in screen on first load', async ({ page }) => {
    await page.goto('/');

    // Should show the sign-in section
    await expect(page.locator('#sign-in-section')).toBeVisible();

    // Should have Google and Apple sign-in buttons
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /apple/i })).toBeVisible();
  });

  test('should show email sign-in form', async ({ page }) => {
    await page.goto('/');

    // Find email and password fields
    const emailInput = page.locator('#login-email');
    const passwordInput = page.locator('#login-password');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('should validate empty email/password', async ({ page }) => {
    await page.goto('/');

    // Click sign in without entering credentials
    const signInButton = page.getByRole('button', { name: /sign in$/i });
    await signInButton.click();

    // Should show error message
    await expect(page.locator('.error-toast-container, #toast')).toContainText(/email|password/i);
  });

  test('should sign in with valid credentials', async ({ page }) => {
    await page.goto('/');

    // Fill in test credentials
    await page.fill('#login-email', 'test@example.com');
    await page.fill('#login-password', 'jasmine2024');

    // Click sign in
    const signInButton = page.getByRole('button', { name: /sign in$/i });
    await signInButton.click();

    // Should redirect to main app
    await expect(page.locator('#main-app, .dashboard')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Sign Out', () => {
  test('should sign out and return to sign-in screen', async ({ page }) => {
    // First sign in
    await page.goto('/');
    await page.fill('#login-email', 'test@example.com');
    await page.fill('#login-password', 'jasmine2024');
    await page.getByRole('button', { name: /sign in$/i }).click();
    await expect(page.locator('#main-app, .dashboard')).toBeVisible({ timeout: 5000 });

    // Find and click sign out
    const signOutButton = page.getByRole('button', { name: /sign out|logout/i });
    if (await signOutButton.isVisible()) {
      await signOutButton.click();
      await expect(page.locator('#sign-in-section')).toBeVisible();
    }
  });
});
