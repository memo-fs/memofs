import { parseWithZod } from "@conform-to/zod/v4";
import { getCtx } from "~/.server/context";
import { consumeMagicLinkToken, rateLimitMessage } from "~/.server/rate-limit";
import { createAuthFromEnv, safeRelativeRedirect } from "~/.server/session";
import type { Route } from "./+types/index";
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
 * Email validation (format + disposable + MX) is handled by the Zod schema's
 * async `superRefine`; no manual validation step needed.
 *
 * Returns a Conform `SubmissionResult` on errors (drives field/form-level
 * error display via `useForm`) or `{ status: 'success', email }` on success
 * (component flips to the "check your inbox" screen).
 */
export async function action({ request, context }: Route.ActionArgs) {
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: SignupSchema,
		async: true,
	});

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

	const auth = createAuthFromEnv(getCtx(context).waitUntil);

	try {
		await auth.api.signInMagicLink({
			body: { email, name, callbackURL },
			// Request headers carry IP/UA so Better Auth's rate-limiting has context.
			headers: request.headers,
		});
	} catch {
		return submission.reply({
			formErrors: ["Something went wrong. Please try again."],
		});
	}

	return { status: "success", email };
}
