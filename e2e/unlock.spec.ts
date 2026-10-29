import { expect, test } from "@playwright/test";

test("members need the choir passcode", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/unlock\?next=%2F/);
  await page.getByLabel("합창단 암호").fill("wrong");
  await page.getByRole("button", { name: "들어가기" }).click();
  await expect(page.locator(".notice-error")).toContainText("암호가 맞지 않아요");
  await page.getByLabel("합창단 암호").fill("test-choir");
  await page.getByRole("button", { name: "들어가기" }).click();
  await expect(page.getByRole("link", { name: /연습용 예제/ })).toBeVisible();
});

test("a song link opened without the passcode returns to that song", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("합창단 암호").fill("test-choir");
  await page.getByRole("button", { name: "들어가기" }).click();
  const href = await page.getByRole("link", { name: /연습용 예제/ }).getAttribute("href");
  await page.context().clearCookies();
  await page.goto(href!);
  await page.getByLabel("합창단 암호").fill("test-choir");
  await page.getByRole("button", { name: "들어가기" }).click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.locator(".part-picker button")).toHaveCount(4);
});
