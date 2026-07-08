import { parseWithZod } from "@conform-to/zod/v4";
import { getCtx } from "~/.server/context";
import { hasMxRecord } from "~/.server/mx-check";
import { consumeMagicLinkToken, rateLimitMessage } from "~/.server/rate-limit";
import { createAuthFromEnv, safeRelativeRedirect } from "~/.server/session";
import type { Route } from "../+types/signup";
import {
	emailDomain,
	emailIssueMessage,
	validateEmail,
} from "../+utils/email-validation";
import { SignupSchema } from "./+utils";

/**
 * Magic-link request action for signup (SC4.1).
 *
 * Runs server-side so Better Auth's `signInMagicLink` is called directly — no
 * extra HTTP hop through the client. Signup adds a `name` field (validated
 * non-empty here); Better Auth uses `name` only when the user doesn't yet
 * exist and ignores it for returning emails, so the same endpoint handles both
 * first sign-up and re-entry.
 *
 * Returns a Conform `SubmissionResult` on errors (drives field/form-level
 * error display via `useForm`) or `{ status: 'success', email }` on success
 * (component flips to the "check your inbox" screen).
 */
export async function action({ request, context }: Route.ActionArgs) {
	const formData = await request.formData();
	const submission = parseWithZod(formData, { schema: SignupSchema });

	if (submission.status !== "success") {
		return submission.reply();
	}

	const { name, email } = submission.value;
	const callbackURL = safeRelativeRedirect(formData.get("callbackURL"));

	// Rate-limit BEFORE any DB/DoH work so a flood never reaches Plunk or the
	// DNS resolver. Surfaced as a form-level error via Conform.
	const limited = await consumeMagicLinkToken(request, getCtx(context));
	const limitedMessage = rateLimitMessage(limited);
	if (limitedMessage) {
		return submission.reply({
			formErrors: [limitedMessage.error],
		});
	}

	// Reject disposable/temporary addresses (business rule, not a format check).
	const validation = validateEmail(email);
	if (!validation.ok) {
		return submission.reply({
			fieldErrors: { email: [emailIssueMessage(validation.issue)] },
		});
	}

	// Signup-only: reject domains that can't receive mail. Login skips this so a
	// transient DoH failure can never lock a returning user out. hasMxRecord
	// fails open (returns true on error), so a DoH outage degrades to "allow".
	const domain = emailDomain(email);
	if (domain && !(await hasMxRecord(domain))) {
		return submission.reply({
			fieldErrors: {
				email: [emailIssueMessage({ kind: "no-mx", domain })],
			},
		});
	}

	const auth = createAuthFromEnv(getCtx(context).waitUntil);

	await auth.api.signInMagicLink({
		body: { email, name, callbackURL },
		// Request headers carry IP/UA so Better Auth's rate-limiting has context.
		headers: request.headers,
	});

	return { status: "success", email };
}
