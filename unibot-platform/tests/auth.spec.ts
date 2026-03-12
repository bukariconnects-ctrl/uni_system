import { test, expect } from "@playwright/test";

const TEST_EMAIL = process.env.TEST_USER_EMAIL || "student@test.unibot.com";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || "Test123456!";

test.describe("Authentication Flow", () => {
  test("should show login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/UniBot/);
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
  });

  test("should reject invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[type='email']", "wrong@test.com");
    await page.fill("input[type='password']", "wrongpassword");
    await page.click("button[type='submit']");
    await expect(page.locator("text=خطأ")).toBeVisible({ timeout: 5000 });
  });

  test("should login with valid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[type='email']", TEST_EMAIL);
    await page.fill("input[type='password']", TEST_PASSWORD);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/(student|faculty|tenant-admin|academic-management|super-admin)/, {
      timeout: 10000,
    });
    await expect(page.locator("text=لوحة التحكم")).toBeVisible();
  });

  test("should redirect unauthenticated users to login", async ({ page }) => {
    await page.goto("/student");
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });

  test("should logout successfully", async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[type='email']", TEST_EMAIL);
    await page.fill("input[type='password']", TEST_PASSWORD);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/(student|faculty|tenant-admin|academic-management|super-admin)/, {
      timeout: 10000,
    });
    await page.click("text=تسجيل الخروج");
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });
});
