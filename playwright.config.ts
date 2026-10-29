import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://localhost:3100", viewport: { width: 390, height: 844 } },
  webServer: { command: "npm run build && npx next start -p 3100", url: "http://localhost:3100", timeout: 240_000, reuseExistingServer: true },
});
