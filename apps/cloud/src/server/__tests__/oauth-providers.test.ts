import { describe, expect, it } from "vitest";

import type { CloudWorkerEnv } from "../env";
import { enabledOAuthProviders } from "../oauth-providers.server";

/**
 * Minimal env stub — only the OAuth bindings matter here. Cast through `as`
 * because `CloudWorkerEnv` also carries R2/Turso bindings that need a Worker
 * runtime to construct; the OAuth fields are plain strings.
 */
function envWith(oauth: {
	githubId?: string;
	githubSecret?: string;
	googleId?: string;
	googleSecret?: string;
}): CloudWorkerEnv {
	return {
		GITHUB_CLIENT_ID: oauth.githubId,
		GITHUB_CLIENT_SECRET: oauth.githubSecret,
		GOOGLE_CLIENT_ID: oauth.googleId,
		GOOGLE_CLIENT_SECRET: oauth.googleSecret,
	} as unknown as CloudWorkerEnv;
}

describe("enabledOAuthProviders", () => {
	it("returns none when no providers are configured", () => {
		expect(enabledOAuthProviders(envWith({}))).toEqual([]);
	});

	it("omits github when only its id is set (secret missing)", () => {
		// A half-configured provider must never surface a button — that would link
		// to a start route that 404s at createAuth.
		expect(enabledOAuthProviders(envWith({ githubId: "gh-id" }))).toEqual([]);
	});

	it("omits github when only its secret is set (id missing)", () => {
		expect(
			enabledOAuthProviders(envWith({ githubSecret: "gh-secret" })),
		).toEqual([]);
	});

	it("includes github when both id + secret are set", () => {
		expect(
			enabledOAuthProviders(
				envWith({ githubId: "gh-id", githubSecret: "gh-secret" }),
			),
		).toEqual(["github"]);
	});

	it("includes google when both id + secret are set", () => {
		expect(
			enabledOAuthProviders(
				envWith({ googleId: "g-id", googleSecret: "g-secret" }),
			),
		).toEqual(["google"]);
	});

	it("returns both in a stable order when all creds are present", () => {
		// Order is the render order in OAuthButtons, so stability matters.
		expect(
			enabledOAuthProviders(
				envWith({
					githubId: "gh-id",
					githubSecret: "gh-secret",
					googleId: "g-id",
					googleSecret: "g-secret",
				}),
			),
		).toEqual(["github", "google"]);
	});
});
