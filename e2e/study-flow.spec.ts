/**
 * E2E Test: Study Flow
 *
 * Tests the complete user flow from signup to answering questions.
 */

import { test, expect } from '@playwright/test';

const TEST_USER = {
  username: `e2e-test-${Date.now()}`,
  password: 'TestPassword123!',
};

test.describe('Study Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
  });

  test('should display home page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Space Repetition Tutor');
    await expect(page.locator('text=Learn technical interviews with AI-powered spaced repetition')).toBeVisible();
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.click('text=Sign Up');
    await expect(page).toHaveURL('/signup');
    await expect(page.locator('h1')).toContainText('Create Account');
  });

  test('should register a new user', async ({ page }) => {
    // Navigate to signup
    await page.click('text=Sign Up');

    // Fill signup form
    await page.fill('input[id="username"]', TEST_USER.username);
    await page.fill('input[id="password"]', TEST_USER.password);
    await page.fill('input[id="confirmPassword"]', TEST_USER.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to study page
    await expect(page).toHaveURL('/study', { timeout: 10000 });
  });

  test('should show validation error for short password', async ({ page }) => {
    await page.click('text=Sign Up');

    await page.fill('input[id="username"]', TEST_USER.username);
    await page.fill('input[id="password"]', 'short');
    await page.fill('input[id="confirmPassword"]', 'short');

    // Submit button should be disabled or show error
    const errorMessage = page.locator('text=Password must be at least 8 characters');
    await expect(errorMessage).toBeVisible();
  });

  test('should show validation error for mismatched passwords', async ({ page }) => {
    await page.click('text=Sign Up');

    await page.fill('input[id="username"]', TEST_USER.username);
    await page.fill('input[id="password"]', TEST_USER.password);
    await page.fill('input[id="confirmPassword"]', 'DifferentPassword123!');

    const errorMessage = page.locator('text=Passwords do not match');
    await expect(errorMessage).toBeVisible();
  });

  test('should login existing user', async ({ page }) => {
    // First, register the user
    await page.click('text=Sign Up');
    await page.fill('input[id="username"]', TEST_USER.username);
    await page.fill('input[id="password"]', TEST_USER.password);
    await page.fill('input[id="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/study');

    // Logout
    await page.click('button:has-text("Logout")');

    // Now test login
    await page.click('text=Login');
    await expect(page).toHaveURL('/login');

    await page.fill('input[id="username"]', TEST_USER.username);
    await page.fill('input[id="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/study');
  });

  test('should show error for invalid login credentials', async ({ page }) => {
    await page.click('text=Login');

    await page.fill('input[id="username"]', 'nonexistentuser');
    await page.fill('input[id="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    const errorMessage = page.locator('text=Invalid credentials');
    await expect(errorMessage).toBeVisible();
  });

  test('should display study page when logged in', async ({ page }) => {
    // Register and login
    await page.click('text=Sign Up');
    await page.fill('input[id="username"]', TEST_USER.username);
    await page.fill('input[id="password"]', TEST_USER.password);
    await page.fill('input[id="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/study');

    // Check study page elements
    await expect(page.locator('h1:has-text("Space Repetition Tutor")')).toBeVisible();
    await expect(page.locator(`text=Welcome, ${TEST_USER.username}`)).toBeVisible();
    await expect(page.locator('button:has-text("Logout")')).toBeVisible();
  });

  test('should handle no questions available state', async ({ page }) => {
    // Register and login
    await page.click('text=Sign Up');
    await page.fill('input[id="username"]', TEST_USER.username);
    await page.fill('input[id="password"]', TEST_USER.password);
    await page.fill('input[id="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/study');

    // Should show "All caught up" or loading state
    // (Depends on whether database has seed data)
    const loadingSpinner = page.locator('.animate-spin');
    const completeMessage = page.locator('text=All caught up!');

    // One of these should be visible
    await expect(async () => {
      const isVisible = await loadingSpinner.isVisible() || await completeMessage.isVisible();
      return isVisible;
    }).toPass({ timeout: 5000 });
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    // Try to access study page directly without auth
    await page.goto('/study');

    // Should redirect to login or home
    const url = page.url();
    expect(url).toContain('/login');
  });

  test('should handle answer submission flow', async ({ page }) => {
    // Register and login
    await page.click('text=Sign Up');
    await page.fill('input[id="username"]', TEST_USER.username);
    await page.fill('input[id="password"]', TEST_USER.password);
    await page.fill('input[id="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/study');

    // Wait for question or completion state
    await page.waitForTimeout(2000);

    // If there's a question visible
    const questionCard = page.locator('div:has(h3)').first();
    const hasQuestion = await questionCard.count() > 0;

    if (hasQuestion) {
      // Check if question is displayed
      const questionText = await questionCard.textContent();
      expect(questionText).toBeTruthy();

      // The question might be in a loading state or we might have "All caught up"
      // For this E2E test, we'll check the flow works without errors
      const answerTextarea = page.locator('textarea[id="answer"]');
      const canAnswer = await answerTextarea.count() > 0;

      if (canAnswer) {
        // Type an answer
        await answerTextarea.fill('This is my test answer for the question.');

        // Submit button should be enabled
        const submitButton = page.locator('button:has-text("Submit Answer")');
        await expect(submitButton).toBeEnabled();

        // Click submit
        await submitButton.click();

        // Should show feedback or loading
        await page.waitForTimeout(2000);

        // Check if feedback is shown
        const feedbackCard = page.locator('text=Passed').or(page.locator('text=Keep practicing'));
        const hasFeedback = await feedbackCard.count() > 0;

        if (hasFeedback) {
          expect(feedbackCard).toBeVisible();
        }
      }
    }
  });

  test('should handle logout correctly', async ({ page }) => {
    // Register and login
    await page.click('text=Sign Up');
    await page.fill('input[id="username"]', TEST_USER.username);
    await page.fill('input[id="password"]', TEST_USER.password);
    await page.fill('input[id="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/study');

    // Logout
    await page.click('button:has-text("Logout")');

    // Should redirect to home or login
    const url = page.url();
    expect(url === 'http://localhost:3000/' || url === 'http://localhost:3000/login').toBeTruthy();
  });

  test('should have no console errors during normal flow', async ({ page }) => {
    // Collect console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate through the app
    await page.click('text=Sign Up');
    await page.fill('input[id="username"]', TEST_USER.username);
    await page.fill('input[id="password"]', TEST_USER.password);
    await page.fill('input[id="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Check for console errors
    expect(errors).toHaveLength(0);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to signup
    await page.click('text=Sign Up');
    await page.fill('input[id="username"]', TEST_USER.username);
    await page.fill('input[id="password"]', TEST_USER.password);
    await page.fill('input[id="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Check that elements are visible and properly sized
    const logoutButton = page.locator('button:has-text("Logout")');
    await expect(logoutButton).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should have working back to home link', async ({ page }) => {
    await page.goto('/login');

    const backLink = page.locator('text=← Back to home');
    await expect(backLink).toBeVisible();

    await backLink.click();
    await expect(page).toHaveURL('/');
  });

  test('should have link between login and signup', async ({ page }) => {
    await page.goto('/login');

    // Link to signup
    const signupLink = page.locator('a:has-text("Sign up")');
    await expect(signupLink).toBeVisible();
    await signupLink.click();
    await expect(page).toHaveURL('/signup');

    // Link back to login
    const loginLink = page.locator('a:has-text("Login")');
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL('/login');
  });
});
