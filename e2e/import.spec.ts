import { expect, test } from "@playwright/test";

test("six-part MusicXML shows every part with its role and draws the score", async ({ page }) => {
  await page.goto("/import");
  await page.getByLabel("악보 파일 고르기").setInputFiles("tests/fixtures/six-parts.musicxml");

  const rows = page.getByTestId("part-row");
  await expect(rows).toHaveCount(6);
  const roles = await rows.locator("select").evaluateAll((els) => els.map((e) => (e as HTMLSelectElement).value));
  expect(roles).toEqual(["S1", "S2", "A", "T1", "T2", "B"]);
  await expect(page.getByText("파트 6개, 마디 3개")).toBeVisible();
  await expect(page.getByTestId("score").locator("svg").first()).toBeVisible({ timeout: 15_000 });
});

test("a Sibelius file gets export guidance", async ({ page }) => {
  await page.goto("/import");
  await page.getByLabel("악보 파일 고르기").setInputFiles({ name: "곡.sib", mimeType: "application/octet-stream", buffer: Buffer.from("x") });
  await expect(page.locator(".notice-error")).toContainText("MusicXML로 내보내");
});

test("a PDF without a converter explains what is needed and offers a retry", async ({ page }) => {
  await page.goto("/import");
  await page.getByLabel("악보 파일 고르기").setInputFiles({ name: "악보.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7") });
  await expect(page.locator(".notice-error")).toContainText("변환 서버가 필요해요");
  await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
});
