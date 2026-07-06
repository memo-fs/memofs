import { Users } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";

/** Empty state when the account has no teams yet (pre-provisioning edge case). */
export function EmptyTeamState() {
	return (
		<Card>
			<CardContent className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
				<Users className="h-8 w-8 text-muted-foreground/40" />
				<p className="text-sm font-medium text-foreground">No team yet</p>
				<p className="max-w-sm text-xs text-muted-foreground">
					Your personal workspace will appear here once your account is
					provisioned. Refresh in a moment.
				</p>
			</CardContent>
		</Card>
	);
}
