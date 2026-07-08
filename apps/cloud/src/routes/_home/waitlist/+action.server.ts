import { parseWithZod } from "@conform-to/zod/v4";
import { sendWaitlistEmail, subscribeUser } from "~/.server/email/resend";
import { hasMxRecord } from "~/.server/mx-check";
import type { Route } from "./+types/index";
import { WaitlistSchema } from "./+utils";

/**
 * Waitlist sign-up action.
 *
 * Validates the submitted email, subscribes the address to the Resend audience
 * list, and sends a confirmation email via the existing `WaitlistTemplate`.
 * No database writes — Resend is the source of truth for waitlist contacts.
 */
export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData();
	const submission = parseWithZod(formData, { schema: WaitlistSchema });

	if (submission.status !== "success") {
		return submission.reply();
	}

	const { email } = submission.value;

	// MX check — reject domains that can't receive mail.
	const domain = email.split("@")[1];
	if (domain && !(await hasMxRecord(domain))) {
		return submission.reply({
			fieldErrors: {
				email: ["That email domain doesn't appear to be reachable. Please use a different address."],
			},
		});
	}

	try {
		// Add to Resend audience segment (fail-open — a Resend error must not
		// prevent the confirmation email from being attempted).
		await subscribeUser(email);
	} catch {
		// Non-fatal: duplicate contacts are fine; log but continue.
	}

	await sendWaitlistEmail(email);

	return { status: "success", email };
}
