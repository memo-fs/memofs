import { StatusCodes } from "http-status-codes";
import { Loader2 } from "lucide-react";
import { data, useFetcher } from "react-router";
import { getCtx, getEnv } from "~/.server/context";
import { enabledOAuthProviders } from "~/.server/oauth-providers";
import { consumeMagicLinkToken, rateLimitMessage } from "~/.server/rate-limit";
import { createAuthFromEnv, safeRelativeRedirect } from "~/.server/session";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	AuthSwitchLink,
	EmailField,
	FormError,
} from "./+components/form-parts";
import { MagicLinkSent } from "./+components/magic-link-sent";
import { OAuthButtons } from "./+components/oauth-buttons";
import type { Route } from "./+types/login";
import { emailIssueMessage, validateEmail } from "./+utils/email-validation";
import type { FetcherResult } from "./+utils/types";
import { useAuthRedirect } from "./hooks/use-auth-redirect";

export function meta() {
	return [
		{ title: "Log in — Memo FS Cloud" },
		{ name: "description", content: "Log in to your Memo FS Cloud account" },
	];
}

/**
 * Exposes the server-derived set of enabled OAuth providers so the buttons
 * render iff `createAuth` will accept them (A2). No DB hit — pure env check.
 */
export async function loader({ context }: Route.LoaderArgs) {
	return { providers: enabledOAuthProviders() };
}

/**
 * Magic-link request action for login (SC4.1).
 *
 * Runs server-side so Better Auth's `signInMagicLink` is called directly — no
 * extra HTTP hop through the client. Better Auth uses the email only to send
 * the link; the actual session is minted on verify (`/api/auth/magic-link/verify`,
 * owned by Better Auth). On success returns `{ ok, email }`; the component uses
 * that to flip to the "check your inbox" state.
 */
export async function action({ request, context }: Route.ActionArgs) {
	const formData = await request.formData();

	const email = String(formData.get("email")).trim();
	const callbackURL = safeRelativeRedirect(formData.get("callbackURL"));

	// Rate-limit before any DB/email work so a flood never reaches Plunk. Login
	// omits the MX check (unlike signup) so a transient DoH failure can't lock a
	// returning user out of their account.
	const limited = await consumeMagicLinkToken(request, getCtx(context));
	const limitedMessage = rateLimitMessage(limited);
	if (limitedMessage) {
		return data({ ok: false, error: limitedMessage.error }, { status: StatusCodes.TOO_MANY_REQUESTS });
	}

	const validation = validateEmail(email);

	if (!validation.ok) {
		return data(
			{ ok: false, error: emailIssueMessage(validation.issue) },
			{ status: StatusCodes.BAD_REQUEST },
		);
	}

	const auth = createAuthFromEnv(getCtx(context).waitUntil);

	await auth.api.signInMagicLink({
		body: { email, callbackURL },
		// Request headers carry IP/UA so Better Auth's rate-limiting has context.
		headers: request.headers,
	});

	return { ok: true, email };
}

/**
 * Login page (SC4.1). Passwordless: the user enters an email, the server
 * action calls Better Auth's `signInMagicLink`, and the link in their email is
 * the only factor. The form uses `useFetcher` (no navigation) so the "sending…"
 * pending state and the "check inbox" result both render inline.
 */
export default function LoginPage({ loaderData }: Route.ComponentProps) {
	const { providers } = loaderData;
	const next = useAuthRedirect();
	const fetcher = useFetcher<FetcherResult>();
	const submitting = fetcher.state === "submitting";
	const result = fetcher.data;

	if (result?.ok) {
		return <MagicLinkSent email={result.email} />;
	}

	return (
		<Card>
			<CardHeader className="text-center">
				<CardTitle className="text-xl">Welcome back</CardTitle>
				<CardDescription>
					We'll email you a secure link to log in — no password needed.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<OAuthButtons providers={providers} callbackURL={next} />
				<fetcher.Form method="post" className="space-y-4">
					{/* Preserve the post-verify destination through the action round-trip. */}
					<input type="hidden" name="callbackURL" value={next} />
					{!result?.ok ? <FormError message={result?.error} /> : null}
					<EmailField />
					<Button type="submit" className="w-full" disabled={submitting}>
						{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{submitting ? "Sending link…" : "Email me a login link"}
					</Button>
				</fetcher.Form>

				<AuthSwitchLink
					to="/signup"
					question="No account?"
					linkText="Sign up free"
				/>
			</CardContent>
		</Card>
	);
}
