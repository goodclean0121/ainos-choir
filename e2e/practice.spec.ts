import { expect, test, type Page } from "@playwright/test";

async function enterChoir(page: Page) {
  await page.goto("/");
  await expect(page).toHaveURL(/\/unlock/);
  await page.getByLabel("합창단 암호").fill("test-choir");
  await page.getByRole("button", { name: "들어가기" }).click();
  await expect(page).toHaveURL(/\/$/);
}

const DIM = "#a9b4b9";

test("practise the alto part of the example song", async ({ page }) => {
  await enterChoir(page);
  await page.getByRole("link", { name: /연습용 예제/ }).click();

  const picker = page.locator(".part-picker button");
  await expect(picker).toHaveCount(4);
  await expect(picker).toHaveText(["소프라노", "알토", "테너", "베이스"]);

  const score = page.getByTestId("score");
  await expect(score.locator("svg").first()).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "알토" }).click();
  await expect(page.getByRole("button", { name: "알토" })).toHaveAttribute("aria-pressed", "true");
  await expect(score.locator(`svg [fill="${DIM}"]`).first()).toBeAttached({ timeout: 15_000 });

  await page.getByRole("switch", { name: /계이름 표시/ }).click();
  await expect(score.locator("svg text", { hasText: /^도$/ }).first()).toBeAttached({ timeout: 15_000 });

  await page.getByRole("button", { name: "mp" }).click();
  await expect(page.getByRole("region", { name: /메조 피아노/ })).toContainText("조금 여리게");

  const head = score.locator(".vf-notehead").first();
  await head.scrollIntoViewIfNeeded();
  const box = (await head.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator(".tapped")).toContainText("(");

  await page.reload();
  await expect(page.getByRole("button", { name: "알토" })).toHaveAttribute("aria-pressed", "true");
});

test("an unknown song says so", async ({ page }) => {
  await enterChoir(page);
  await page.goto("/songs/no-such-song");
  await expect(page.locator(".notice-error")).toContainText("곡을 찾을 수 없어요");
});
