import { parseWithZod } from "@conform-to/zod/v4";
import { getCtx } from "~/.server/context";
import { consumeMagicLinkToken, rateLimitMessage } from "~/.server/rate-limit";
import { createAuthFromEnv, safeRelativeRedirect } from "~/.server/session";
import type { Route } from "./+types/index";
import { LoginSchema } from "./+utils";

/**
 * Magic-link request action for login (SC4.1).
 *
 * Runs server-side so Better Auth's `signInMagicLink` is called directly — no
 * extra HTTP hop through the client. Login omits the MX check (unlike signup)
 * so a transient DoH failure can't lock a returning user out.
 *
 * Email validation (format + disposable) is handled by the Zod schema's
 * `superRefine`; no manual validation step needed.
 *
 * Returns a Conform `SubmissionResult` on errors (drives field/form-level
 * error display via `useForm`) or `{ status: 'success', email }` on success
 * (component flips to the "check your inbox" screen).
 */
export async function action({ request, context }: Route.ActionArgs) {
	const formData = await request.formData();
	const submission = parseWithZod(formData, { schema: LoginSchema });

	if (submission.status !== "success") {
		return submission.reply();
	}

	const { email } = submission.value;
	const callbackURL = safeRelativeRedirect(formData.get("callbackURL"));

	// Rate-limit before any DB/email work so a flood never reaches Plunk.
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
			body: { email, callbackURL },
			headers: request.headers,
		});
	} catch {
		return submission.reply({
			formErrors: ["Something went wrong. Please try again."],
		});
	}

	return { status: "success", email };
}
