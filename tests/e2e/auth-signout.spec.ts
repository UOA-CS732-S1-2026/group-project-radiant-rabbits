import { expect, type Page, test } from "@playwright/test";

async function loginInTestMode(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: /sign in with github/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test("signs out and blocks protected route access", async ({ page }) => {
  await loginInTestMode(page);

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/^http:\/\/localhost:3000\/$/);
  await expect(
    page.getByRole("button", { name: /sign in with github/i }).first(),
  ).toBeVisible();

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/^http:\/\/localhost:3000\/$/);
});
