import { expect, test } from "@playwright/test";

test("home page includes responsible copy", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Preserve your meaning");
  await expect(page.getByText("bypass AI detectors")).toHaveCount(0);
});
