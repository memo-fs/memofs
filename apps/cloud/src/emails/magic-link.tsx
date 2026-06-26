/**
 * Magic-link sign-in email (React Email template).
 *
 * Rendered to HTML by the Plunk transport ({@link ../server/email.ts}) and sent
 * as the `body` of Plunk's `/send` request. Plain-text is derived from the same
 * element via `render(..., { plainText: true })` so there is a single source of
 * truth for copy.
 *
 * Branding follows the dashboard: a single blue accent (`--primary`) and no
 * decorative colors. Hex (`#0061e7`) is used instead of oklch because email
 * clients have unreliable CSS-color support — hex is the lowest common
 * denominator. The value is the sRGB equivalent of `--primary` (see
 * `src/styles/app.css`); if the token changes, update both in lockstep.
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

export interface MagicLinkEmailProps {
	/** The full magic-link URL (Better Auth `${baseURL}/api/auth/magic-link/verify?token=…`). */
	url: string;
	/** Link lifetime in minutes, surfaced to the user so they know to act fast. */
	expiresInMinutes: number;
}

/**
 * The magic-link email. Stateless and presentational — the URL is minted by
 * Better Auth and passed in; this component only lays it out.
 */
export function MagicLinkEmail({ url, expiresInMinutes }: MagicLinkEmailProps) {
	return (
		<Html>
			<Head />
			<Preview>Sign in to TekMemo Cloud</Preview>
			<Body style={body}>
				<Container style={container}>
					<Heading style={heading}>Sign in to TekMemo Cloud</Heading>
					<Text style={paragraph}>
						Click the button below to sign in. This link expires in{" "}
						{expiresInMinutes} minutes and can only be used once.
					</Text>
					<Button href={url} style={button}>
						Sign in
					</Button>
					<Text style={{ ...paragraph, fontSize: "14px", color: "#6b7280" }}>
						If you didn&apos;t request this, you can safely ignore this email.
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
