import { MailCheck } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";

/**
 * "Check your inbox" confirmation shown after a magic link is requested.
 * Shared by login and signup — both surface the same success state under
 * passwordless auth (SC4.1).
 */
export function MagicLinkSent({
	email,
	onReset,
}: {
	email: string;
	onReset: () => void;
}) {
	return (
		<Card className="text-center">
			<CardContent className="pt-6">
				<div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
					<MailCheck className="w-6 h-6 text-primary" />
				</div>
				<h2 className="text-xl font-semibold mb-2">Check your inbox</h2>
				<p className="text-sm text-muted-foreground mb-6">
					We sent a magic link to{" "}
					<strong className="text-foreground">{email}</strong>. Click it to
					continue — it expires in 15 minutes.
				</p>
				<button
					type="button"
					onClick={onReset}
					className="text-xs text-primary hover:underline font-medium"
				>
					Use a different email
				</button>
			</CardContent>
		</Card>
	);
}
