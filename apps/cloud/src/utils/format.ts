/**
 * Pure presentational helpers for the dashboard UI.
 *
 * These are format-only utilities (bytes, dates, initials) with no test data and
 * no DB coupling — they were lifted out of the old mock fixtures so that real
 * data routes can import formatting without dragging in test data.
 *
 * Time-relative strings ("just now", "5m ago") are computed against the current
 * wall-clock at render time; the dashboard re-renders on navigation so they stay
 * fresh enough for a control plane. They degrade gracefully when given a date
 * in the future (clock skew) — the worst case is "just now".
 */

/**
 * Formats a byte count as a human-readable string with binary-ish thresholds.
 * Uses 1024-based units (B → KB → MB → GB) with one decimal place (two for GB).
 */
export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
	return `${(bytes / 1073741824).toFixed(2)} GB`;
}

/**
 * Formats an ISO timestamp as a localized short date ("Jun 22, 2026").
 * Returns an empty-ish fallback for invalid input rather than throwing.
 */
export function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

/**
 * Formats an ISO timestamp as a relative time ("just now", "5m ago", "3d ago").
 * Clamps negative deltas (future dates from clock skew) to "just now".
 */
export function formatRelative(iso: string): string {
	const diff = Math.max(0, Date.now() - new Date(iso).getTime());
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * Returns uppercase initials from a display name (first letter of each word).
 * Empty/whitespace input yields an empty string rather than crashing.
 */
export function userInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase();
}
