import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { Loader2 } from "lucide-react";
import { useFetcher } from "react-router";
import { enabledOAuthProviders } from "~/.server/oauth-providers";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { buildNoindexMeta } from "~/lib/seo";
import {
	AuthSwitchLink,
	FormError,
	LegalNotice,
} from "../+components/form-parts";
import { MagicLinkSent } from "../+components/magic-link-sent";
import { OAuthButtons } from "../+components/oauth-buttons";
import { useAuthRedirect } from "../hooks/use-auth-redirect";
import type { Route } from "./+types/index";
import { type SignupResult, SignupSchema } from "./+utils";

export const meta = () => buildNoindexMeta("Sign up — Memo FS Cloud");

export async function loader() {
	return { providers: enabledOAuthProviders() };
}

export { action } from "./+actions.server";

export default function SignupPage({ loaderData }: Route.ComponentProps) {
	const { providers } = loaderData;
	const next = useAuthRedirect();
	const fetcher = useFetcher<SignupResult>();
	const submitting = fetcher.state === "submitting";
	const result = fetcher.data;

	const [form, fields] = useForm({
		lastResult: result,
		constraint: getZodConstraint(SignupSchema),
		onValidate: ({ formData }) =>
			parseWithZod(formData, { schema: SignupSchema }),
		shouldRevalidate: "onInput",
	});

	if (result && "email" in result) {
		return <MagicLinkSent email={result.email} />;
	}

	return (
		<Card>
			<CardHeader className="text-center">
				<CardTitle className="text-xl">Create your account</CardTitle>
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
						<Label htmlFor={fields.name.id}>Name</Label>
						<Input
							{...getInputProps(fields.name, { type: "text" })}
							key={fields.name.key}
							placeholder="Alex Chen"
							autoComplete="name"
						/>
						{fields.name.errors && <FormError errors={fields.name.errors} />}
					</div>
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
						{submitting ? (
							<Loader2 className="mr-2 size-4 animate-spin" />
						) : (
							"Create account"
						)}
					</Button>
					{form.errors && <FormError errors={form.errors} />}
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
