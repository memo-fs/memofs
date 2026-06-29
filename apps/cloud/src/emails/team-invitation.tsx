/**
 * Team-invitation email (React Email template).
 *
 * Rendered to HTML by the Plunk transport ({@link ../server/email.ts}) and sent
 * as the `body` of Plunk's `/send` request — the sibling of the magic-link
 * template. The accept link is the single-use, expiring token route
 * (`/team/accept?token=…`); this component only lays it out.
 *
 * Branding follows {@link ./magic-link}: a single blue accent (`--primary`) and
 * no decorative colors. Hex (`#0061e7`) is used instead of oklch because email
 * clients have unreliable CSS-color support — hex is the lowest common
 * denominator. The value is the sRGB equivalent of `--primary` (see
 * `src/styles/app.css`); if the token changes, update both in lockstep.
 *
 * @see {@link ./render-team-invitation} — the render seam the transport calls.
 */
import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Link,
	Preview,
	Text,
} from "react-email";

/** Brand blue = sRGB of dashboard `--primary` oklch(0.685 0.169 237.323). */
const PRIMARY = "#0061e7";

export interface TeamInvitationEmailProps {
	/** The invitee's name/email — surfaced as a greeting. */
	inviteeName: string;
	/** The human name of the team being joined. */
	teamName: string;
	/** The inviting account's display name ("Alex invited you…"). */
	inviterName: string;
	/** The role the invitee receives on accept (Admin/Member), for the copy. */
	role: "admin" | "member";
	/** The full accept URL (`${baseURL}/team/accept?token=…`). */
	url: string;
	/** Link lifetime in days, surfaced so the recipient knows to act. */
	expiresInDays: number;
}

/**
 * The team-invitation email. Stateless and presentational — the URL is minted by
 * the dashboard action and passed in; this component only lays it out. The
 * "ignore if unexpected" line is the standard unsolicited-invite guard.
 */
export function TeamInvitationEmail({
	inviteeName,
	teamName,
	inviterName,
	role,
	url,
	expiresInDays,
}: TeamInvitationEmailProps) {
	return (
		<Html>
			<Head />
			<Preview>
				{inviterName} invited you to join {teamName}
			</Preview>
			<Body style={body}>
				<Container style={container}>
					<Heading style={heading}>Join {teamName}</Heading>
					<Text style={paragraph}>
						<strong>{inviterName}</strong> invited you to join the{" "}
						<strong>{teamName}</strong> workspace on TekMemo Cloud as a{" "}
						<strong>{roleLabel(role)}</strong>. You'll be able to sync and share
						the canonical <code style={code}>.tekmemo/</code> memory with the
						rest of the team.
					</Text>
					<Button href={url} style={button}>
						Accept invitation
					</Button>
					<Text style={{ ...paragraph, fontSize: "14px", color: "#6b7280" }}>
						Hi {inviteeName} — this link expires in {expiresInDays}{" "}
						{expiresInDays === 1 ? "day" : "days"} and can only be used once. If
						you didn&apos;t expect this invitation, you can safely ignore this
						email.
					</Text>
					<Text style={{ ...paragraph, fontSize: "14px", color: "#6b7280" }}>
						Or paste this link into your browser:{" "}
						<Link href={url} style={link}>
							{url}
						</Link>
					</Text>
					<Hr style={hr} />
					<Text style={{ ...paragraph, fontSize: "12px", color: "#9ca3af" }}>
						TekMemo Cloud
					</Text>
				</Container>
			</Body>
		</Html>
	);
}

/** Renders the role enum as a capitalized label for the email copy. */
function roleLabel(role: "admin" | "member"): string {
	return role === "admin" ? "Admin" : "Member";
}

const body: React.CSSProperties = {
	backgroundColor: "#f9fafb",
	fontFamily:
		"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
	margin: 0,
	padding: "24px 0",
};

const container: React.CSSProperties = {
	backgroundColor: "#ffffff",
	border: "1px solid #e5e7eb",
	borderRadius: "8px",
	margin: "0 auto",
	maxWidth: "480px",
	padding: "32px 24px",
};

const heading: React.CSSProperties = {
	color: "#111827",
	fontSize: "20px",
	fontWeight: 600,
	margin: "0 0 16px",
};

const paragraph: React.CSSProperties = {
	color: "#374151",
	fontSize: "16px",
	lineHeight: "24px",
	margin: "0 0 16px",
};

const code: React.CSSProperties = {
	backgroundColor: "#f3f4f6",
	borderRadius: "4px",
	fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
	fontSize: "14px",
	padding: "1px 4px",
};

const button: React.CSSProperties = {
	backgroundColor: PRIMARY,
	borderRadius: "6px",
	color: "#ffffff",
	display: "block",
	fontSize: "16px",
	fontWeight: 600,
	margin: "0 0 24px",
	padding: "12px 24px",
	textAlign: "center",
	textDecoration: "none",
};

const link: React.CSSProperties = { color: PRIMARY, wordBreak: "break-all" };

const hr: React.CSSProperties = {
	border: "none",
	borderTop: "1px solid #e5e7eb",
	margin: "24px 0",
};
