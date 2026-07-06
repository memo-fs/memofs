import { Button, Heading, Link, Text } from "react-email";
import { COLORS, emailStyles } from "../constants";
import { EmailLayout } from "./index";

const EmailHeading = Heading as any;
const EmailText = Text as any;
const EmailButton = Button as any;
const EmailLink = Link as any;

export function MagicLinkTemplate({
	url,
	expiresInMinutes,
}: {
	url: string;
	expiresInMinutes: number;
}) {
	return (
		<EmailLayout previewText="Sign in to Memo FS Cloud">
			<EmailHeading style={emailStyles.heading}>Sign in to Memo FS Cloud</EmailHeading>
			<EmailText style={emailStyles.paragraph}>
				Click the button below to sign in. This link expires in{" "}
				{expiresInMinutes} minutes and can only be used once.
			</EmailText>
			<EmailButton href={url} style={emailStyles.button}>
				Sign in
			</EmailButton>
			<EmailText
				style={{
					...emailStyles.paragraph,
					fontSize: "14px",
					color: COLORS.muted,
				}}
			>
				If you didn&apos;t request this, you can safely ignore this email.
			</EmailText>
			<EmailText
				style={{
					...emailStyles.paragraph,
					fontSize: "14px",
					color: COLORS.muted,
				}}
			>
				Or paste this link into your browser:{" "}
				<EmailLink href={url} style={emailStyles.link}>
					{url}
				</EmailLink>
			</EmailText>
		</EmailLayout>
	);
}
