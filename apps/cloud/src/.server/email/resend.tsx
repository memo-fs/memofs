import { env } from "cloudflare:workers";
import type React from "react";
import { Resend } from "resend";
import { INVITATION_TTL_DAYS, MAGIC_LINK_TTL_MINUTES } from "./constants";
import { MagicLinkTemplate } from "./templates/magic-link";
import { TeamInvitationTemplate } from "./templates/team-invitation";
import { WaitlistTemplate } from "./templates/waitlist";

let resendInstance: Resend | null = null;

/**
 * Retrieves the cached Resend SDK client instance, or instantiates it if not already created.
 * Reuses the single instance across all email sending operations.
 */
export function getResendClient() {
	const key = env.RESEND_API_KEY;
	if (!resendInstance) {
		resendInstance = new Resend(key);
	}
	return resendInstance;
}

/**
 * Subscribes a user's email address to the Resend audience list.
 */
export function subscribeUser(email: string) {
	const client = getResendClient();
	if (env.ENV === "development") {
		console.info("[email:dev] subscribe", { to: email });
		return;
	}
	return client.contacts.create({
		email: email,
		firstName: "AI",
		lastName: "Engineer",
		segments: [{ id: env.RESEND_SEGMENT_ID }],
	});
}

/**
 * Shared reusable function to send an email via the Resend SDK.
 * Supports sending either a pre-rendered HTML string or a React Element.
 */
export function sendMail({
	to,
	subject,
	react,
}: {
	to: string | [string];
	subject: string;
	react: React.ReactElement;
}) {
	const client = getResendClient();
	if (env.ENV === "development") {
		console.info("[email:dev] send", { to, subject });
		return;
	}
	return client.emails.send({
		from: env.RESEND_FROM,
		to,
		subject,
		react,
	});
}

/**
 * Sends a waitlist confirmation welcome email to a subscriber.
 */
export function sendWaitlistEmail(email: string, name?: string) {
	return sendMail({
		to: email,
		subject: "You're on the Memo FS Cloud waitlist!",
		react: <WaitlistTemplate name={name} />,
	});
}

/**
 * Builds the magic-link mailer object Better Auth expects.
 */
export async function sendMagicLinkMail({
	email,
	url,
}: {
	email: string;
	url: string;
}) {
	if (env.ENV === "development") {
		console.info("[email:dev] magic link", { to: email, url });
		return;
	}
	const res = await sendMail({
		to: email,
		subject: "Sign in to Memo FS Cloud",
		react: (
			<MagicLinkTemplate url={url} expiresInMinutes={MAGIC_LINK_TTL_MINUTES} />
		),
	});
	if (res?.error) {
		throw new Error(`Resend magic link failed: ${res.error.message}`);
	}
}

export async function sendTeamInvitationMail(mail: {
	email: string;
	url: string;
	teamName: string;
	inviterName: string;
	inviteeName?: string;
	role?: "admin" | "member";
	expiresInDays?: number;
}) {
	if (env.ENV === "development") {
		console.info("[email:dev] team invitation", mail);
		return;
	}
	const res = await sendMail({
		to: mail.email,
		subject: `${mail.inviterName} invited you to join ${mail.teamName}`,
		react: (
			<TeamInvitationTemplate
				inviteeName={mail.inviteeName ?? "there"}
				teamName={mail.teamName}
				inviterName={mail.inviterName}
				role={mail.role ?? "member"}
				url={mail.url}
				expiresInDays={mail.expiresInDays ?? INVITATION_TTL_DAYS}
			/>
		),
	});
	if (res?.error) {
		throw new Error(`Resend team invitation failed: ${res.error.message}`);
	}
}
