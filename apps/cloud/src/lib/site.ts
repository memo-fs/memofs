/**
 * Single source of truth for off-app destinations referenced across the
 * marketing + dashboard surfaces. Every external URL lives here so a host
 * change is a one-line edit, never a grep-and-replace across components.
 */
export const SITE_LINKS = {
	/** OSS documentation front door. */
	docs: "https://docs.memo.tekbreed.com",
	/** Public source repository. */
	github: "https://github.com/tekbreed/tekmemo",
	/** Private channel for data-access / erasure / privacy requests. */
	privacyEmail: "mailto:privacy@tekbreed.com",
	/** Billing + subscription support. */
	billingEmail: "mailto:billing@tekbreed.com",
} as const;
