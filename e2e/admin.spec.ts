import { expect, test, type Page } from "@playwright/test";

async function enterChoir(page: Page, passcode = "test-choir") {
  await page.goto("/unlock");
  await page.getByLabel("합창단 암호").fill(passcode);
  await page.getByRole("button", { name: "들어가기" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("a saved song stays hidden until the admin publishes it", async ({ page }) => {
  await page.goto("/admin/new");
  await page.getByLabel("악보 파일 고르기").setInputFiles("tests/fixtures/four-parts.musicxml");
  await page.getByLabel("곡 제목").fill("새 찬양 연습");
  await page.getByRole("button", { name: "초안으로 저장" }).click();
  await expect(page).toHaveURL(/\/admin\/songs\/[0-9a-f-]{36}$/);
  await expect(page.locator(".badge")).toHaveText("초안");
  const adminUrl = page.url();

  await enterChoir(page);
  await expect(page.getByRole("link", { name: "새 찬양 연습" })).toHaveCount(0);

  await page.goto(adminUrl);
  await page.getByRole("button", { name: "공개하기" }).click();
  await expect(page.getByRole("status").filter({ hasText: "공개했어요" })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "새 찬양 연습" }).click();
  await expect(page.locator(".part-picker button")).toHaveCount(4);

  await page.goto(adminUrl);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "지우기" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("link", { name: /새 찬양 연습/ })).toHaveCount(0);
});

test("changing the passcode asks every device again", async ({ page }) => {
  await enterChoir(page);
  await page.goto("/admin/settings");
  await page.getByLabel("새 합창단 암호").fill("new-code-1");
  await page.getByLabel("한 번 더").fill("new-code-1");
  await page.getByRole("button", { name: "암호 저장" }).click();
  await expect(page.getByRole("status").filter({ hasText: "새 암호를 저장했어요" })).toBeVisible();

  await page.goto("/");
  await expect(page).toHaveURL(/\/unlock/);
  await enterChoir(page, "new-code-1");

  // put the shared test passcode back for the other tests
  await page.goto("/admin/settings");
  await page.getByLabel("새 합창단 암호").fill("test-choir");
  await page.getByLabel("한 번 더").fill("test-choir");
  await page.getByRole("button", { name: "암호 저장" }).click();
  await expect(page.getByRole("status").filter({ hasText: "새 암호를 저장했어요" })).toBeVisible();
});
