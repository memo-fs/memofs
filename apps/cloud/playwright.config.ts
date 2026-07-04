import { defineConfig, devices } from "@playwright/test";

const PORT = 8787;
const ORIGIN = `http://127.0.0.1:${PORT}`;

export default defineConfig({
	testDir: "./tests/e2e",
	timeout: 30 * 1000,
	expect: {
		timeout: 10 * 1000,
	},
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? "github" : "html",
	use: {
		baseURL: ORIGIN,
		trace: "on-first-retry",
		screenshot: "only-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
			},
		},
	],

	webServer: {
		command: `pnpm preview --port ${PORT}`,
		url: `${ORIGIN}/v1/health`,
		reuseExistingServer: !process.env.CI,
		timeout: 180 * 1000,
		stdout: "pipe",
		stderr: "pipe",
	},
});
