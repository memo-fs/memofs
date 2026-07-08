import { Link } from "react-router";

/**
 * Shared fragments for the passwordless auth forms (SC4.1). Extracted to keep
 * login + signup in lock-step and under the component line cap. None of these
 * carry state — they're pure presentational pieces fed by the parent form.
 */

/**
 * Inline error banner. Accepts a single string or an array of strings
 * (Conform field errors are `string[]`). Renders nothing when the array is
 * empty.
 */
export function FormError({ errors }: { errors: string | string[] }) {
	const messages = Array.isArray(errors) ? errors : [errors];
	if (messages.length === 0) return null;
	return (
		<div
			role="alert"
			aria-live="assertive"
			className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive"
		>
			{messages.map((msg) => (
				<p key={msg}>{msg}</p>
			))}
		</div>
	);
}

/** "No account? Sign up" / "Already have an account? Log in" switch link. */
export function AuthSwitchLink({
	to,
	question,
	linkText,
}: {
	to: string;
	question: string;
	linkText: string;
}) {
	return (
		<p className="text-center text-xs text-muted-foreground mt-6">
			{question}{" "}
			<Link to={to} className="font-medium text-primary hover:underline">
				{linkText}
			</Link>
		</p>
	);
}

/** Terms + Privacy acknowledgement, shown on signup only. */
export function LegalNotice() {
	return (
		<p className="mt-4 text-center text-[10px] leading-normal text-muted-foreground">
			By signing up you agree to our{" "}
			<Link to="/terms" className="text-primary hover:underline">
				Terms
			</Link>{" "}
			and{" "}
			<Link to="/privacy" className="text-primary hover:underline">
				Privacy Policy
			</Link>
		</p>
	);
}
