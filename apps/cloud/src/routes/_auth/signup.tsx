import { Loader2 } from "lucide-react";
import { data, useFetcher } from "react-router";
import { getCtx, getEnv } from "~/.server/context";
import { hasMxRecord } from "~/.server/mx-check";
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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
	AuthSwitchLink,
	EmailField,
	FormError,
	LegalNotice,
} from "./+components/form-parts";
import { MagicLinkSent } from "./+components/magic-link-sent";
import { OAuthButtons } from "./+components/oauth-buttons";
import type { Route } from "./+types/signup";
import {
	emailDomain,
	emailIssueMessage,
	validateEmail,
} from "./+utils/email-validation";
import type { FetcherResult } from "./+utils/types";
import { useAuthRedirect } from "./hooks/use-auth-redirect";

export function meta() {
	return [
		{ title: "Sign up — Memo FS Cloud" },
		{ name: "description", content: "Create your free Memo FS Cloud account" },
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
 * Magic-link request action for signup (SC4.1).
 *
 * Runs server-side so Better Auth's `signInMagicLink` is called directly — no
 * extra HTTP hop through the client. Signup adds a `name` field (validated
 * non-empty here); Better Auth uses `name` only when the user doesn't yet
 * exist and ignores it for returning emails, so the same endpoint handles both
 * first sign-up and re-entry. On success returns `{ ok, email }`; the component
 * uses that to flip to the "check your inbox" state.
 */
export async function action({ request, context }: Route.ActionArgs) {
	const formData = await request.formData();
	const name = String(formData.get("name")).trim();
	const email = String(formData.get("email")).trim();
	const callbackURL = safeRelativeRedirect(formData.get("callbackURL"));

	if (!name) {
		return data(
			{ ok: false, error: "Please enter your name." },
			{ status: 400 },
		);
	}

	// Rate-limit BEFORE any DB/DoH work so a flood never reaches Plunk or the
	// DNS resolver. 429-style outcome surfaces the same as a validation error
	// (inline, no navigation) — the message tells the user when to retry.
	const limited = await consumeMagicLinkToken(request, getCtx(context));
	const limitedMessage = rateLimitMessage(limited);
	if (limitedMessage) {
		return data({ ok: false, error: limitedMessage.error }, { status: 429 });
	}

	const validation = validateEmail(email);
	if (!validation.ok) {
		return data(
			{ ok: false, error: emailIssueMessage(validation.issue) },
			{ status: 400 },
		);
	}

	// Signup-only: reject domains that can't receive mail. Login skips this so a
	// transient DoH failure can never lock a returning user out. hasMxRecord
	// fails open (returns true on error), so a DoH outage degrades to "allow".
	const domain = emailDomain(email);
	if (domain && !(await hasMxRecord(domain))) {
		return data(
			{
				ok: false,
				error: emailIssueMessage({ kind: "no-mx", domain }),
			},
			{ status: 400 },
		);
	}

	const auth = createAuthFromEnv(getCtx(context).waitUntil);

	await auth.api.signInMagicLink({
		body: { email, name, callbackURL },
		// Request headers carry IP/UA so Better Auth's rate-limiting has context.
		headers: request.headers,
	});

	return { ok: true, email };
}

/**
 * Signup page (SC4.1). Passwordless: name + email go through the server action
 * → Better Auth `signInMagicLink`; the link in the user's email is the only
 * factor. The provisioning hook (`databaseHooks.user.create.after`) fires on
 * first verify, creating the billing account + default project. The form uses
 * `useFetcher` (no navigation) so the "sending…" pending state + the "check
 * inbox" result both render inline.
 */
export default function SignupPage({ loaderData }: Route.ComponentProps) {
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
				<CardTitle className="text-xl">Create your account</CardTitle>
				<CardDescription>Free tier — no credit card required</CardDescription>
			</CardHeader>
			<CardContent>
				<OAuthButtons providers={providers} callbackURL={next} />

				<fetcher.Form method="post" className="space-y-4">
					{/* Preserve the post-verify destination through the action round-trip. */}
					<input type="hidden" name="callbackURL" value={next} />
					{!result?.ok ? <FormError message={result?.error} /> : null}
					<div className="space-y-1.5">
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							name="name"
							type="text"
							placeholder="Alex Chen"
							autoComplete="name"
						/>
					</div>
					<EmailField />
					<Button type="submit" className="w-full" disabled={submitting}>
						{submitting ? (
							<>
								<Loader2 className="mr-2 size-4 animate-spin" /> Sending link…
							</>
						) : (
							"Create account"
						)}
					</Button>
				</fetcher.Form>

				<LegalNotice />
				<AuthSwitchLink
					to="/login"
					question="Already have an account?"
					linkText="Log in"
				/>
			</CardContent>
		</Card>
	);
}
