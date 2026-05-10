import { expect, test } from "@playwright/test";

async function loginToDashboard(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByTestId("test-sign-in").click();
  await page.waitForURL("**/join-create-switch-group");
  await page
    .getByRole("button", { name: "Continue to Test Dashboard" })
    .click();
  await page.waitForURL("**/dashboard");
}

async function expectLandingSignIn(page: import("@playwright/test").Page) {
  try {
    await expect(page.getByTestId("test-sign-in")).toBeVisible({
      timeout: 2000,
    });
  } catch {
    await expect(
      page.getByRole("button", { name: /sign in with github/i }).first(),
    ).toBeVisible();
  }
}

test.describe("Smoke Tests", () => {
  test("shows Test Sign In in test mode", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("test-sign-in")).toBeVisible();
  });

  test("logs in with test mode and loads dashboard", async ({ page }) => {
    await loginToDashboard(page);
    await expect(page.getByText("Project Overview").first()).toBeVisible();
  });

  test("can navigate between core pages from side nav", async ({ page }) => {
    await loginToDashboard(page);

    await page.getByRole("link", { name: "Current Sprint" }).click();
    await expect(page).toHaveURL(/\/current-sprint/);

    await page.getByRole("link", { name: "Past Sprints" }).click();
    await expect(page).toHaveURL(/\/past-sprints/);

    await page.getByRole("link", { name: "Teammates" }).click();
    await expect(page).toHaveURL(/\/teammates/);

    await page.getByRole("link", { name: "Change Group" }).click();
    await expect(page).toHaveURL(/\/join-create-switch-group/);
  });

  test("join/create/switch tabs are visible and clickable", async ({
    page,
  }) => {
    await page.goto("/join-create-switch-group");

    const joinTab = page.getByRole("tab", { name: "Join a Group" });
    const createTab = page.getByRole("tab", { name: "Create a Group" });
    const currentTab = page.getByRole("tab", { name: "Your Groups" });

    await expect(joinTab).toBeVisible();
    await expect(createTab).toBeVisible();
    await expect(currentTab).toBeVisible();

    await createTab.click();
    await expect(createTab).toHaveAttribute("aria-selected", "true");

    await currentTab.click();
    await expect(currentTab).toHaveAttribute("aria-selected", "true");

    await joinTab.click();
    await expect(joinTab).toHaveAttribute("aria-selected", "true");
  });

  test("leave-group confirm flow opens and can be cancelled", async ({
    page,
  }) => {
    await loginToDashboard(page);

    await page.getByRole("link", { name: "Teammates" }).click();
    await expect(page).toHaveURL(/\/teammates/);

    const leaveGroupButton = page.getByRole("button", { name: "Leave Group" });
    await expect(leaveGroupButton).toBeVisible();
    await leaveGroupButton.click();

    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Leave Group" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
  });

  test("log out button is clickable and returns to landing page", async ({
    page,
  }) => {
    await loginToDashboard(page);

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("test-sign-in")).toBeVisible();
  });

  test("unauthenticated users are redirected from protected routes", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/");
    await expectLandingSignIn(page);
  });

  test("dashboard help overlay opens and closes", async ({ page }) => {
    await loginToDashboard(page);

    await page
      .getByRole("button", { name: /Help: dashboard and sprints/i })
      .click();
    await expect(
      page.getByRole("heading", { name: "Sprints on the dashboard" }),
    ).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("heading", { name: "Sprints on the dashboard" }),
    ).toHaveCount(0);
  });

  test("leave-group confirm can complete and redirect", async ({ page }) => {
    await loginToDashboard(page);

    await page.route("**/api/groups/leave", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Left group successfully" }),
      });
    });

    await page.getByRole("link", { name: "Teammates" }).click();
    await expect(page).toHaveURL(/\/teammates/);

    await page.getByRole("button", { name: "Leave Group" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Leave", exact: true })
      .click();

    await expect(page).toHaveURL(/\/join-create-switch-group/);
  });
});
