import { StatusCodes } from "http-status-codes";
import { data } from "react-router";
import { sendWaitlistEmail, subscribeUser } from "~/.server/email/resend";
import { hasMxRecord } from "~/.server/mx-check";
import type { Route } from "./+types/index";

/**
 * Waitlist sign-up action.
 *
 * Validates the submitted email, subscribes the address to the Resend audience
 * list, and sends a confirmation email via the existing `WaitlistTemplate`.
 * No database writes — Resend is the source of truth for waitlist contacts.
 */
export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData();
	const email = String(formData.get("email") ?? "")
		.trim()
		.toLowerCase();

	if (!email?.includes("@")) {
		return data(
			{ ok: false as const, error: "Please enter a valid email address." },
			{ status: StatusCodes.BAD_REQUEST },
		);
	}

	const domain = email.split("@")[1];
	if (domain && !(await hasMxRecord(domain))) {
		return data(
			{
				ok: false as const,
				error:
					"That email domain doesn't appear to be reachable. Please use a different address.",
			},
			{ status: StatusCodes.BAD_REQUEST },
		);
	}

	try {
		// Add to Resend audience segment (fail-open — a Resend error must not
		// prevent the confirmation email from being attempted).
		await subscribeUser(email);
	} catch {
		// Non-fatal: duplicate contacts are fine; log but continue.
	}

	await sendWaitlistEmail(email);

	return { ok: true as const, email };
}
