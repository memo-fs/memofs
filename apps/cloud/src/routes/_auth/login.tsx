import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
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
import { emailIssueMessage, validateEmail } from "./+utils/email-validation";

export function meta() {
	return [
		{ title: "Log in — TekMemo Cloud" },
		{ name: "description", content: "Log in to your TekMemo Cloud account" },
	];
}

export default function LoginPage() {
	const navigate = useNavigate();
	const [params] = useSearchParams();
	const next = params.get("next") ?? "/dashboard";

	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [sent, setSent] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const validation = validateEmail(email);
		if (!validation.ok) {
			setError(emailIssueMessage(validation.issue));
			return;
		}
		setLoading(true);
		setError("");
		await new Promise((r) => setTimeout(r, 600));
		setLoading(false);
		setSent(true);
	};

	if (sent) {
		return <MagicLinkSent email={email} onReset={() => setSent(false)} />;
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
				<OAuthButtons onSelect={() => navigate(next, { replace: true })} />

				<form onSubmit={handleSubmit} className="space-y-4">
					<FormError message={error} />
					<EmailField value={email} onChange={setEmail} />
					<Button type="submit" className="w-full" disabled={loading}>
						{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{loading ? "Sending link…" : "Email me a login link"}
					</Button>
				</form>

				<AuthSwitchLink
					to="/signup"
					question="No account?"
					linkText="Sign up free"
				/>
			</CardContent>
		</Card>
	);
}
