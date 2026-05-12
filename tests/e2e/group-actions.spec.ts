import { expect, type Page, test } from "@playwright/test";

async function loginInTestMode(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: /sign in with github/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test("ends project from dashboard", async ({ page }) => {
  await loginInTestMode(page);

  await expect(
    page.getByRole("heading", { name: "Project Overview" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "End Project" }).first().click();
  await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 10_000 });
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "End Project" })
    .click();

  await expect(page).toHaveURL(/\/join-create-switch-group/);
});

test("leaves group from teammates page", async ({ page }) => {
  await loginInTestMode(page);
  await page.goto("/teammates");

  await page.getByRole("button", { name: "Leave Group" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Leave" })
    .click();

  await expect(page).toHaveURL(/\/join-create-switch-group/);
});
