import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";

const PORT = "8787";
const BASE_URL = "http://127.0.0";

export default defineConfig({
	testDir: "./tests/e2e",
	timeout: 5 * 1000,
	expect: {
		timeout: 5 * 1000,
	},
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 1,
	workers: process.env.CI ? 1 : undefined,
	reporter: "html",
	use: {
		baseURL: `${BASE_URL}.1:${PORT}`,
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
		command: `npx miniflare --port ${PORT}`,
		port: Number(PORT),
		url: BASE_URL,
		reuseExistingServer: true,
		stdout: "pipe",
		stderr: "pipe",
		env: { PORT },
	},
});
