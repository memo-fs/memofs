import type { FetcherWithComponents } from "react-router";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import type { ApiKeyActionData } from "../api-keys";

/**
 * The revoke-confirmation dialog (SC3.x). Receives the id of the key the user
 * asked to revoke (or `null` to stay closed) and submits via the route's revoke
 * fetcher. Closing clears the selection so the parent table re-enables the row.
 *
 * @param revokeId       the key id to revoke, or `null` when closed.
 * @param onClose        clears the pending revoke selection.
 * @param revokeFetcher  the route-scoped fetcher bound to the revoke action.
 */
export function RevokeKeyDialog({
	revokeId,
	onClose,
	revokeFetcher,
}: {
	revokeId: string | null;
	onClose: () => void;
	revokeFetcher: FetcherWithComponents<ApiKeyActionData>;
}) {
	const revoking = revokeFetcher.state !== "idle";

	return (
		<Dialog open={!!revokeId} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="text-base font-semibold">
						Revoke this key?
					</DialogTitle>
					<DialogDescription className="text-xs">
						Any machine using this key will get 401 errors on next sync. This
						cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="gap-2 sm:gap-0">
					<Button
						variant="outline"
						size="sm"
						className="h-9 text-xs"
						onClick={onClose}
					>
						Cancel
					</Button>
					<Button
						variant="destructive"
						size="sm"
						className="h-9 text-xs"
						disabled={revoking}
						onClick={() => {
							if (!revokeId) return;
							revokeFetcher.submit(
								{ intent: "revoke", keyId: revokeId },
								{ method: "post" },
							);
							onClose();
						}}
					>
						{revoking ? "Revoking…" : "Revoke key"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
