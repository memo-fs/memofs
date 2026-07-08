import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { Loader2 } from "lucide-react";
import { useFetcher } from "react-router";
import { enabledOAuthProviders } from "~/.server/oauth-providers";
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
import { buildNoindexMeta } from "~/lib/seo";
import {
	AuthSwitchLink,
	FormError,
} from "../+components/form-parts";
import { MagicLinkSent } from "../+components/magic-link-sent";
import { OAuthButtons } from "../+components/oauth-buttons";
import type { Route } from "../+types/login";
import { useAuthRedirect } from "../hooks/use-auth-redirect";
import { type LoginResult, LoginSchema } from "./+utils";

export { action } from "./+actions.server";

export function meta() {
	return buildNoindexMeta("Log in — Memo FS Cloud");
}

/**
 * Exposes the server-derived set of enabled OAuth providers so the buttons
 * render iff `createAuth` will accept them (A2). No DB hit — pure env check.
 */
export async function loader() {
	return { providers: enabledOAuthProviders() };
}


export { action } from "./+actions.server";

/**
 * Login page (SC4.1). Passwordless: the user enters an email, the server
 * action calls Better Auth's `signInMagicLink`, and the link in their email is
 * the only factor. The form uses `useFetcher` (no navigation) so the "sending…"
 * pending state and the "check inbox" result both render inline.
 */
export default function LoginPage({ loaderData }: Route.ComponentProps) {
	const { providers } = loaderData;
	const next = useAuthRedirect();
	const fetcher = useFetcher<LoginResult>();
	const submitting = fetcher.state === "submitting";
	const result = fetcher.data;

	const [form, fields] = useForm({
		lastResult: result,
		constraint: getZodConstraint(LoginSchema),
		onValidate: ({ formData }) =>
			parseWithZod(formData, { schema: LoginSchema }),
		shouldRevalidate: "onInput",
	});

	if (result && "email" in result) {
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

				<fetcher.Form
					{...getFormProps(form)}
					method="post"
					className="space-y-4"
				>
					<input type="hidden" name="callbackURL" value={next} />
					<div className="space-y-1.5">
						<Label htmlFor={fields.email.id}>Email</Label>
						<Input
							{...getInputProps(fields.email, { type: "email" })}
							key={fields.email.key}
							placeholder="you@example.com"
							autoComplete="email"
							inputMode="email"
						/>
						{fields.email.errors && <FormError errors={fields.email.errors} />}
					</div>
					<Button type="submit" className="w-full" disabled={submitting}>
						{submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
						{submitting ? "Sending link…" : "Email me a login link"}
					</Button>
					{form.errors && <FormError errors={form.errors} />}
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
