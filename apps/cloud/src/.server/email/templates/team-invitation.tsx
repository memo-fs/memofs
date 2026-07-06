import { Button, Heading, Link, Text } from "react-email";
import { COLORS, emailStyles } from "../constants";
import { EmailLayout } from "./index";

const EmailHeading = Heading as any;
const EmailText = Text as any;
const EmailButton = Button as any;
const EmailLink = Link as any;

export interface TeamInvitationEmailProps {
	inviteeName: string;
	teamName: string;
	inviterName: string;
	role: "admin" | "member";
	url: string;
	expiresInDays: number;
}

export function TeamInvitationTemplate({
	inviteeName,
	teamName,
	inviterName,
	role,
	url,
	expiresInDays,
}: TeamInvitationEmailProps) {
	return (
		<EmailLayout previewText={`${inviterName} invited you to join ${teamName}`}>
			<EmailHeading style={emailStyles.heading}>Join {teamName}</EmailHeading>
			<EmailText style={emailStyles.paragraph}>
				<strong>{inviterName}</strong> invited you to join the{" "}
				<strong>{teamName}</strong> workspace on Memo FS Cloud as a{" "}
				<strong>{role === "admin" ? "Admin" : "Member"}</strong>. You'll be able
				to sync and share the canonical{" "}
				<code style={emailStyles.code}>.memofs/</code> memory with the rest of
				the team.
			</EmailText>
			<EmailButton href={url} style={emailStyles.button}>
				Accept invitation
			</EmailButton>
			<EmailText
				style={{
					...emailStyles.paragraph,
					fontSize: "14px",
					color: COLORS.muted,
				}}
			>
				Hi {inviteeName} — this link expires in {expiresInDays}{" "}
				{expiresInDays === 1 ? "day" : "days"} and can only be used once. If you
				didn&apos;t expect this invitation, you can safely ignore this email.
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
