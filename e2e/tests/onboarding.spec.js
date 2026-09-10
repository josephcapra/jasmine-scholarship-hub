// E2E Tests for Onboarding Flow
// Run: npx playwright test

const { test, expect } = require('@playwright/test');

test.describe('Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to simulate new user
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Sign in first
    await page.fill('#login-email', 'newuser@example.com');
    await page.fill('#login-password', 'jasmine2024');
    await page.getByRole('button', { name: /sign in$/i }).click();
    await page.waitForTimeout(1000);
  });

  test('should show onboarding for new users', async ({ page }) => {
    // Should show onboarding modal or section
    const onboardingVisible = await page.locator('.onboarding-modal, #onboarding-section, .setup-wizard').isVisible();
    expect(onboardingVisible).toBeTruthy();
  });

  test('should collect basic profile info', async ({ page }) => {
    // Wait for onboarding
    await page.waitForSelector('.onboarding-modal, #onboarding-section, .setup-wizard', { timeout: 5000 });

    // Fill in name
    const firstNameInput = page.locator('input[name="firstName"], #first-name, #firstName');
    const lastNameInput = page.locator('input[name="lastName"], #last-name, #lastName');

    if (await firstNameInput.isVisible()) {
      await firstNameInput.fill('Test');
    }
    if (await lastNameInput.isVisible()) {
      await lastNameInput.fill('User');
    }
  });

  test('should skip onboarding for returning users', async ({ page }) => {
    // Set up returning user profile
    await page.evaluate(() => {
      localStorage.setItem('jasmine_student_profile', JSON.stringify({
        email: 'returning@example.com',
        firstName: 'Test',
        lastName: 'User'
      }));
      localStorage.setItem('jasmine_onboarding_complete', 'true');
    });

    // Reload
    await page.reload();
    await page.fill('#login-email', 'returning@example.com');
    await page.fill('#login-password', 'jasmine2024');
    await page.getByRole('button', { name: /sign in$/i }).click();

    // Should go directly to dashboard, not onboarding
    await expect(page.locator('#main-app, .dashboard, #section-home')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Profile Persistence', () => {
  test('should clear profile when different user signs in', async ({ page }) => {
    // Set up user A profile
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('jasmine_student_profile', JSON.stringify({
        email: 'usera@example.com',
        firstName: 'User',
        lastName: 'A',
        school: 'School A'
      }));
    });

    // Sign in as user B
    await page.fill('#login-email', 'userb@example.com');
    await page.fill('#login-password', 'jasmine2024');
    await page.getByRole('button', { name: /sign in$/i }).click();
    await page.waitForTimeout(1000);

    // Check that profile was reset
    const profile = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('jasmine_student_profile') || '{}');
    });

    // Should NOT have User A's school
    expect(profile.school).not.toBe('School A');
    // Should have User B's email
    expect(profile.email).toBe('userb@example.com');
  });
});
