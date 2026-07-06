/**
 * Account-deletion dialog with typed confirmation (SC3.6 danger zone).
 *
 * The user must type `DELETE` exactly to enable the button — a deliberate
 * gate against accidental irreversible data loss. The route action re-validates
 * the typed confirmation server-side, so a client-side bypass can't trigger the
 * purge. On success the fetcher redirects to `/login` (the session is destroyed
 * by the user-row cascade).
 */

import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

/** The exact string the user must type to enable deletion. */
const CONFIRMATION_TOKEN = "DELETE";

export function DeleteAccountDialog({
	open,
	onOpenChange,
	accountId,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	accountId: string | null;
}) {
	const deleteFetcher = useFetcher<{ ok: boolean; error?: string }>();
	const [confirmText, setConfirmText] = useState("");
	const isPending = deleteFetcher.state === "submitting";
	const canSubmit = confirmText === CONFIRMATION_TOKEN && !isPending;
	const error = deleteFetcher.data?.error;

	// Reset the input whenever the dialog closes.
	useEffect(() => {
		if (!open) setConfirmText("");
	}, [open]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="text-base font-semibold text-destructive">
						Delete your account?
					</DialogTitle>
					<DialogDescription className="text-xs">
						This permanently deletes your account, all synced blobs (R2), and
						all database records. This cannot be undone.
					</DialogDescription>
				</DialogHeader>

				<deleteFetcher.Form method="post" className="space-y-4 py-2">
					<input type="hidden" name="intent" value="delete-account" />
					<input type="hidden" name="accountId" value={accountId ?? ""} />

					<div className="space-y-2">
						<Label htmlFor="confirm-delete" className="text-xs">
							Type{" "}
							<span className="font-mono font-bold text-destructive">
								DELETE
							</span>{" "}
							to confirm
						</Label>
						<Input
							id="confirm-delete"
							name="confirm"
							value={confirmText}
							onChange={(e) => setConfirmText(e.target.value)}
							className="h-9 text-xs"
							autoComplete="off"
							placeholder="DELETE"
							disabled={isPending}
						/>
					</div>

					{accountId && (
						<p className="font-mono text-[10px] text-muted-foreground">
							Account: {accountId}
						</p>
					)}
					{error && <p className="text-[10px] text-destructive">{error}</p>}

					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-9 text-xs"
							onClick={() => onOpenChange(false)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="destructive"
							size="sm"
							className="h-9 text-xs"
							disabled={!canSubmit}
						>
							{isPending ? "Deleting…" : "Delete permanently"}
						</Button>
					</div>
				</deleteFetcher.Form>
			</DialogContent>
		</Dialog>
	);
}
