import { expect, test } from "@playwright/test";

test("test-mode login redirects to dashboard without group selection", async ({
  page,
}) => {
  await page.goto("/");

  await page
    .getByRole("button", { name: /sign in with github/i })
    .first()
    .click();

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  await expect(
    page.getByRole("heading", { name: "Project Overview" }),
  ).toBeVisible();
});
