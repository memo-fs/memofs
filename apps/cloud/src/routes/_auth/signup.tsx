import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
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
import { emailIssueMessage, validateEmail } from "./+utils/email-validation";

export function meta() {
	return [
		{ title: "Sign up — TekMemo Cloud" },
		{ name: "description", content: "Create your free TekMemo Cloud account" },
	];
}

export default function SignupPage() {
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [sent, setSent] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			setError("Please enter your name.");
			return;
		}
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
				<CardTitle className="text-xl">Create your account</CardTitle>
				<CardDescription>Free tier — no credit card required</CardDescription>
			</CardHeader>
			<CardContent>
				<OAuthButtons
					onSelect={() => navigate("/dashboard", { replace: true })}
				/>

				<form onSubmit={handleSubmit} className="space-y-4">
					<FormError message={error} />
					<div className="space-y-1.5">
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							type="text"
							placeholder="Alex Chen"
							value={name}
							onChange={(e) => setName(e.target.value)}
							autoComplete="name"
						/>
					</div>
					<EmailField value={email} onChange={setEmail} />
					<Button type="submit" className="w-full" disabled={loading}>
						{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{loading ? "Creating account…" : "Create account"}
					</Button>
				</form>

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
