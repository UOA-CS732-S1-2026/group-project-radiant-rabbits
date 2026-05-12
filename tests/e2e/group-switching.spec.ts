import { expect, type Page, test } from "@playwright/test";

async function loginInTestMode(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: /sign in with github/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test("switches between join/create/current group tabs and navigates to set-group", async ({
  page,
}) => {
  await loginInTestMode(page);
  await page.getByRole("link", { name: "Change Group" }).click();
  await expect(page).toHaveURL(/\/join-create-switch-group/);

  await expect(page.getByText("joinable-repo")).toBeVisible();

  await page.getByRole("tab", { name: "Create a Group" }).click();
  await expect(page.getByText("new-team-repo")).toBeVisible();

  await page.getByRole("button", { name: "new-team-repo" }).click();
  await expect(page).toHaveURL(/\/set-group\?/);
  await expect(page.getByText("create a group for")).toBeVisible();
  await expect(page.getByText("radiant-rabbits/new-team-repo")).toBeVisible();

  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Change Group" }).click();
  await expect(page).toHaveURL(/\/join-create-switch-group/);
  await page.getByRole("tab", { name: "Your Groups" }).click();
  await expect(page.getByText("sprint-hub-repo")).toBeVisible();

  await page.getByRole("tab", { name: "Archived" }).click();
  await expect(page.getByText("legacy-repo")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "legacy-repo radiant-rabbits" }),
  ).toContainText("Archived");
});

test("selects current group and joins group successfully", async ({ page }) => {
  await loginInTestMode(page);
  await page.getByRole("link", { name: "Change Group" }).click();
  await expect(page).toHaveURL(/\/join-create-switch-group/);

  await page.getByRole("tab", { name: "Your Groups" }).click();
  await page.getByRole("button", { name: "sprint-hub-repo" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "Change Group" }).click();
  await expect(page).toHaveURL(/\/join-create-switch-group/);
  await page.getByRole("tab", { name: "Join a Group" }).click();
  await page.getByRole("button", { name: "joinable-repo" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
