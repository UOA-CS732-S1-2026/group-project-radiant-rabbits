import { expect, type Page, test } from "@playwright/test";

async function loginInTestMode(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: /sign in with github/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test("end-project modal closes on Escape and backdrop click", async ({
  page,
}) => {
  await loginInTestMode(page);

  await page.getByRole("button", { name: "End Project" }).first().click();
  await expect(page.getByRole("alertdialog")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toBeHidden();

  await page.getByRole("button", { name: "End Project" }).first().click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Close" })
    .click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
});

test("leave-group modal keeps confirm disabled while request is in flight", async ({
  page,
}) => {
  await loginInTestMode(page);
  await page.goto("/teammates");

  await page.route("**/api/groups/leave", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: "Successfully left the group" }),
    });
  });

  await page.getByRole("button", { name: "Leave Group" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "Leave" }).click();
  await expect(dialog.getByRole("button", { name: "Working…" })).toBeDisabled();

  await expect(page).toHaveURL(/\/join-create-switch-group/);
});
