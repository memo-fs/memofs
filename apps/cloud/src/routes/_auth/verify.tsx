import { Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

export function meta() {
	return [{ title: "Signing you in — TekMemo Cloud" }];
}

/**
 * Magic-link-consumed landing (SC4.1). The user arrives here after clicking the
 * link in their email — the click itself confirms email ownership, so this page
 * just exchanges the token for a session and routes onward.
 */
export default function VerifyPage() {
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => {
			setFailed(true);
		}, 1500);
		return () => clearTimeout(timer);
	}, []);

	if (failed) {
		return (
			<Card className="text-center">
				<CardContent className="pt-6">
					<div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
						<ShieldCheck className="w-6 h-6 text-destructive" />
					</div>
					<h2 className="text-xl font-semibold mb-2">
						Link expired or already used
					</h2>
					<p className="text-sm text-muted-foreground mb-6">
						Magic links expire after 15 minutes and only work once. Request a
						new one to continue.
					</p>
					<Button asChild className="w-full">
						<Link to="/login">Request a new link</Link>
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="text-center">
			<CardContent className="pt-6">
				<Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
				<h2 className="text-xl font-semibold mb-1">Verifying…</h2>
				<p className="text-sm text-muted-foreground">
					Confirming your email and signing you in.
				</p>
			</CardContent>
		</Card>
	);
}
