import { test, expect } from "@playwright/test";

const TEST_EMAIL = process.env.TEST_USER_EMAIL || "student@test.unibot.com";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || "Test123456!";

test.describe("Student Journey", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[type='email']", TEST_EMAIL);
    await page.fill("input[type='password']", TEST_PASSWORD);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/student/, { timeout: 10000 });
  });

  test("should display student dashboard", async ({ page }) => {
    await expect(page.locator("text=لوحة التحكم")).toBeVisible();
  });

  test("should navigate to materials page", async ({ page }) => {
    await page.click("text=محتوى المقررات");
    await page.waitForURL(/\/student\/materials/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/student\/materials/);
  });

  test("should navigate to assignments page", async ({ page }) => {
    await page.click("text=التكاليف");
    await page.waitForURL(/\/student\/assignments/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/student\/assignments/);
  });

  test("should navigate to attendance page", async ({ page }) => {
    await page.click("text=حضوري");
    await page.waitForURL(/\/student\/attendance/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/student\/attendance/);
  });

  test("should navigate to grades page", async ({ page }) => {
    await page.click("text=درجاتي");
    await page.waitForURL(/\/student\/grades/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/student\/grades/);
  });

  test("should navigate to messages page", async ({ page }) => {
    await page.click("text=الرسائل");
    await page.waitForURL(/\/student\/messages/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/student\/messages/);
  });

  test("should navigate to UniBot chat", async ({ page }) => {
    await page.click("text=UniBot");
    await page.waitForURL(/\/student\/unibot/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/student\/unibot/);
  });

  test("should navigate to tickets page", async ({ page }) => {
    await page.click("text=تذاكري");
    await page.waitForURL(/\/student\/tickets/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/student\/tickets/);
  });

  test("should open new ticket form", async ({ page }) => {
    await page.click("text=تذاكري");
    await page.waitForURL(/\/student\/tickets/, { timeout: 5000 });
    await page.click("text=تذكرة جديدة");
    await expect(page.locator("select[name='category']")).toBeVisible();
    await expect(page.locator("input[name='title']")).toBeVisible();
    await expect(page.locator("textarea[name='description']")).toBeVisible();
  });

  test("should fill ticket form and proceed to AI step", async ({ page }) => {
    await page.click("text=تذاكري");
    await page.waitForURL(/\/student\/tickets/, { timeout: 5000 });
    await page.click("text=تذكرة جديدة");
    await page.selectOption("select[name='category']", "technical_problem");
    await page.fill("input[name='title']", "مشكلة اختبارية");
    await page.fill("textarea[name='description']", "هذا وصف تجريبي لتذكرة اختبارية");
    await page.click("text=التالي — استشارة UniBot");
    await expect(
      page.locator("text=UniBot يبحث عن إجابة").or(page.locator("text=وجدنا إجابة")).or(page.locator("text=لم يتمكن"))
    ).toBeVisible({ timeout: 15000 });
  });

  test("should toggle dark mode", async ({ page }) => {
    const htmlEl = page.locator("html");
    await expect(htmlEl).not.toHaveClass(/dark/);
    await page.click("[aria-label='تبديل الوضع']");
    await expect(htmlEl).toHaveClass(/dark/);
    await page.click("[aria-label='تبديل الوضع']");
    await expect(htmlEl).not.toHaveClass(/dark/);
  });

  test("should navigate to profile page", async ({ page }) => {
    const profileLink = page.locator("a[href='/student/profile']");
    await profileLink.click();
    await page.waitForURL(/\/student\/profile/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/student\/profile/);
  });
});
