import type React from "react";

/**
 * Brand color tokens and time-to-live settings for Memo FS Cloud emails.
 * Hex colors are used to ensure maximum compatibility with all major email clients.
 */
export const COLORS = {
	background: "#0B0C0E", // sleek dark background
	card: "#141518", // premium card background
	foreground: "#CBD5E1", // primary text
	primary: "#FFFFFF", // brand focus / primary buttons
	primaryForeground: "#0B0C0E",
	border: "#27282F", // border lines
	accent: "#5E6AD2", // brand accent / ring / link color
	muted: "#6B7280", // secondary / muted copy
	mutedLight: "#9CA3AF", // lighter footer elements
} as const;

export const INVITATION_TTL_DAYS = 7;
export const MAGIC_LINK_TTL_MINUTES = 5;

export const emailStyles = {
	body: {
		backgroundColor: COLORS.background,
		fontFamily:
			"-apple-system, BlinkMacSystemFont, 'Sora', 'Geist', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
		margin: 0,
		padding: "48px 0",
	} as React.CSSProperties,

	container: {
		backgroundColor: COLORS.card,
		border: `1px solid ${COLORS.border}`,
		borderRadius: "0px", // zero border-radius broadsheet style
		margin: "0 auto",
		maxWidth: "480px",
		padding: "40px 32px",
	} as React.CSSProperties,

	heading: {
		color: COLORS.primary,
		fontSize: "20px",
		fontWeight: 600,
		margin: "0 0 16px",
		letterSpacing: "-0.02em",
	} as React.CSSProperties,

	paragraph: {
		color: COLORS.foreground,
		fontSize: "15px",
		lineHeight: "24px",
		margin: "0 0 16px",
	} as React.CSSProperties,

	button: {
		backgroundColor: COLORS.primary,
		borderRadius: "0px", // zero border-radius broadsheet style
		color: COLORS.primaryForeground,
		display: "block",
		fontSize: "15px",
		fontWeight: 600,
		margin: "24px 0",
		padding: "12px 24px",
		textAlign: "center" as const,
		textDecoration: "none",
	} as React.CSSProperties,

	link: {
		color: COLORS.accent,
		wordBreak: "break-all" as const,
		textDecoration: "underline",
	} as React.CSSProperties,

	hr: {
		border: "none",
		borderTop: `1px solid ${COLORS.border}`,
		margin: "32px 0 24px",
	} as React.CSSProperties,

	code: {
		backgroundColor: COLORS.border,
		borderRadius: "0px", // zero border-radius broadsheet style
		color: COLORS.primary,
		fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
		fontSize: "13px",
		padding: "2px 6px",
	} as React.CSSProperties,

	footer: {
		color: COLORS.mutedLight,
		fontSize: "11px",
		margin: 0,
		textTransform: "uppercase" as const,
		letterSpacing: "0.05em",
	} as React.CSSProperties,
};
