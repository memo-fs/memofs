import { Plus } from "lucide-react";
import { useState } from "react";
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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { ApiKeyActionData } from "../api-keys";

/**
 * The "create API key" dialog (SC3.x). Owns its label state and submits via the
 * route's create fetcher (no navigation). On success the parent's effect lifts
 * the one-time raw key into the reveal dialog; this dialog just resets.
 *
 * Extracted from `api-keys.tsx` to keep the page component under the 100-line
 * cap and the dialog's state self-contained.
 *
 * @param createFetcher the route-scoped fetcher bound to the create action.
 */
export function CreateKeyDialog({
	createFetcher,
}: {
	createFetcher: FetcherWithComponents<ApiKeyActionData>;
}) {
	const [open, setOpen] = useState(false);
	const [label, setLabel] = useState("");
	const submitting = createFetcher.state !== "idle";

	const close = () => {
		setOpen(false);
		setLabel("");
	};

	return (
		<>
			<Button size="sm" onClick={() => setOpen(true)} className="h-9 text-xs">
				<Plus className="mr-1.5 h-4 w-4" /> New key
			</Button>

			<Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="text-base font-semibold">
							Create API key
						</DialogTitle>
						<DialogDescription className="text-xs">
							Give this key a label so you know which machine it belongs to.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 py-2">
						<div className="space-y-1.5">
							<Label htmlFor="key-label" className="text-xs">
								Label
							</Label>
							<Input
								id="key-label"
								placeholder="e.g. laptop, ci, work-desktop"
								value={label}
								onChange={(e) => setLabel(e.target.value)}
								className="h-9 text-xs"
							/>
						</div>
					</div>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button
							variant="outline"
							size="sm"
							className="h-9 text-xs"
							onClick={close}
						>
							Cancel
						</Button>
						<Button
							onClick={() =>
								createFetcher.submit(
									{ intent: "create", label },
									{ method: "post" },
								)
							}
							disabled={!label || submitting}
							size="sm"
							className="h-9 text-xs"
						>
							{submitting ? "Creating…" : "Create key"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
