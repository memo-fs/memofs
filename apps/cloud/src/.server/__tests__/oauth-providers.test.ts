import { env } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";
import { enabledOAuthProviders } from "../oauth-providers";

vi.mock("cloudflare:workers", () => ({
	env: {} as any,
}));

function setOAuthEnv(oauth: {
	githubId?: string;
	githubSecret?: string;
	googleId?: string;
	googleSecret?: string;
}) {
	// OAuth creds are env-gated: absent in test by default. Coerce to "" so the
	// assignment satisfies the `Env.GITHUB_*: string` contract without widening
	// the ambient type (the production code path treats "" the same as unset).
	env.GITHUB_CLIENT_ID = oauth.githubId ?? "";
	env.GITHUB_CLIENT_SECRET = oauth.githubSecret ?? "";
	env.GOOGLE_CLIENT_ID = oauth.googleId ?? "";
	env.GOOGLE_CLIENT_SECRET = oauth.googleSecret ?? "";
}

describe("enabledOAuthProviders", () => {
	it("returns none when no providers are configured", () => {
		setOAuthEnv({});
		expect(enabledOAuthProviders()).toEqual([]);
	});

	it("omits github when only its id is set (secret missing)", () => {
		setOAuthEnv({ githubId: "gh-id" });
		expect(enabledOAuthProviders()).toEqual([]);
	});

	it("omits github when only its secret is set (id missing)", () => {
		setOAuthEnv({ githubSecret: "gh-secret" });
		expect(enabledOAuthProviders()).toEqual([]);
	});

	it("includes github when both id + secret are set", () => {
		setOAuthEnv({ githubId: "gh-id", githubSecret: "gh-secret" });
		expect(enabledOAuthProviders()).toEqual(["github"]);
	});

	it("includes google when both id + secret are set", () => {
		setOAuthEnv({ googleId: "g-id", googleSecret: "g-secret" });
		expect(enabledOAuthProviders()).toEqual(["google"]);
	});

	it("returns both in a stable order when all creds are present", () => {
		setOAuthEnv({
			githubId: "gh-id",
			githubSecret: "gh-secret",
			googleId: "g-id",
			googleSecret: "g-secret",
		});
		expect(enabledOAuthProviders()).toEqual(["github", "google"]);
	});
});
