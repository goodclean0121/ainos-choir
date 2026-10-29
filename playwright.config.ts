import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://localhost:3100", viewport: { width: 390, height: 844 } },
  webServer: {
    // Test mode: in-memory songs (passcode "test-choir") and a stand-in admin.
    command: "AINOS_TEST_MODE=1 npm run build && AINOS_TEST_MODE=1 npx next start -p 3100", url: "http://localhost:3100", timeout: 240_000, reuseExistingServer: true },
});
