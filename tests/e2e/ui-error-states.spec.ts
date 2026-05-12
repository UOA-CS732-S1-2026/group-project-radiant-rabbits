import { expect, type Page, test } from "@playwright/test";

async function loginInTestMode(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: /sign in with github/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test("shows create/join/select error states in join-create-switch page", async ({
  page,
}) => {
  await loginInTestMode(page);

  await page.route("**/api/groups/select", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Failed to update current group" }),
    });
  });

  await page.route("**/api/groups/join", async (route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "Invite code is required" }),
    });
  });

  await page.route("**/api/groups", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Failed to create group." }),
    });
  });

  await page.getByRole("link", { name: "Change Group" }).click();
  await expect(page).toHaveURL(/\/join-create-switch-group/);

  await page.getByRole("tab", { name: "Your Groups" }).click();
  await page.getByRole("button", { name: "sprint-hub-repo" }).click();
  await expect(page.getByText("Failed to update current group")).toBeVisible();

  await page.getByRole("tab", { name: "Join a Group" }).click();
  await page.getByRole("button", { name: "joinable-repo" }).click();
  await expect(page.getByText("Invite code is required")).toBeVisible();

  await page.getByRole("tab", { name: "Create a Group" }).click();
  await page.getByRole("button", { name: "new-team-repo" }).click();
  await expect(page).toHaveURL(/\/set-group\?/);
  await page.getByRole("button", { name: "Create Group" }).click();
  await expect(page.getByText("Failed to create group.")).toBeVisible();
});

test("shows error message when ending project fails", async ({ page }) => {
  await loginInTestMode(page);

  await page.route("**/api/groups/*/archive", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Failed to end project" }),
    });
  });

  await page.getByRole("button", { name: "End Project" }).first().click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "End Project" })
    .click();

  await expect(page.getByText("Failed to end project")).toBeVisible();
});
