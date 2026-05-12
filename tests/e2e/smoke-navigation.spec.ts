import { expect, type Page, test } from "@playwright/test";

async function loginInTestMode(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: /sign in with github/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test("navigates across core pages and verifies key content", async ({
  page,
}) => {
  await loginInTestMode(page);

  await expect(
    page.getByRole("heading", { name: "Project Overview" }),
  ).toBeVisible();
  await expect(page.getByText("Project metrics")).toBeVisible();

  await page.getByRole("link", { name: "Current Sprint" }).click();
  await expect(page).toHaveURL(/\/current-sprint$/);
  await expect(
    page.getByText("Test mode current sprint placeholder."),
  ).toBeVisible();

  await page.getByRole("link", { name: "Past Sprints" }).click();
  await expect(page).toHaveURL(/\/past-sprints$/);
  await expect(
    page.getByRole("heading", { name: "Past Sprints", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Sprint 1")).toBeVisible();

  await page.getByRole("link", { name: "Teammates" }).click();
  await expect(page).toHaveURL(/\/teammates$/);
  await expect(
    page.getByRole("heading", { name: "Teammates", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Playwright Test User")).toBeVisible();

  await page.getByRole("link", { name: "Change Group" }).click();
  await expect(page).toHaveURL(/\/join-create-switch-group/);
  await expect(page.getByRole("tab", { name: "Join a Group" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Create a Group" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Your Groups" })).toBeVisible();
});
