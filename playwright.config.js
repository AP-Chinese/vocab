import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  // Screenshots live next to the tests, one folder per phone, so they're easy to browse on GitHub.
  snapshotPathTemplate: "{testDir}/screenshots/{projectName}/{arg}{ext}",
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:8080",
    locale: "en-US",
    timezoneId: "America/New_York",
  },
  expect: {
    // Strict: even a small link or a changed word must fail. Rendering is deterministic in this environment.
    toHaveScreenshot: { animations: "disabled", maxDiffPixels: 0 },
  },
  projects: [
    // Smallest common iPhone, and a typical large Android phone. Only Chromium is installed, so both use it.
    { name: "iphone-se", use: { ...devices["iPhone SE"], browserName: "chromium" } },
    { name: "pixel-7", use: { ...devices["Pixel 7"], browserName: "chromium" } },
  ],
  webServer: {
    command: "npx http-server site -p 8080 -c-1 -s",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
  },
});
