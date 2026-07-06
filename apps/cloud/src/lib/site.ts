/**
 * Single source of truth for off-app destinations referenced across the
 * marketing + dashboard surfaces. Every external URL lives here so a host
 * change is a one-line edit, never a grep-and-replace across components.
 */
export const SITE_LINKS = {
	/** Hosted serverless query API. */
	apiUrl: "https://memofs.dev/api/v1",
	/** OSS documentation front door. */
	docs: "https://docs.memofs.dev",
	/** Public source repository. */
	github: "https://github.com/christophersesugh/memofs",
	/** Private channel for data-access / erasure / privacy requests. */
	privacyEmail: "mailto:privacy@memofs.dev",
	/** Billing + subscription support. */
	billingEmail: "mailto:support@memofs.dev",
} as const;
