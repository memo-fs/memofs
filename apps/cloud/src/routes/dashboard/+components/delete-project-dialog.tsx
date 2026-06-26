import { AlertTriangle } from "lucide-react";
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

/**
 * Shared delete-project confirmation (SC3.2). Used by both the projects list
 * and the project detail page — identical destructive-action contract (typed
 * confirmation), so it's extracted rather than duplicated.
 *
 * Projects are read-only replicas at v1 (D1); deletion purges the file
 * manifests + cursor history + replica blobs.
 */
export function DeleteProjectDialog({
	open,
	projectName,
	confirmName,
	onConfirmChange,
	onCancel,
	onConfirm,
	loading,
}: {
	open: boolean;
	projectName: string;
	confirmName: string;
	onConfirmChange: (value: string) => void;
	onCancel: () => void;
	onConfirm: () => void;
	loading: boolean;
}) {
	return (
		<Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="text-base font-semibold">
						Delete project?
					</DialogTitle>
					<DialogDescription className="text-xs">
						This permanently deletes the project "{projectName}", all synced
						file records, and cursor history. This action cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3 py-2">
					<div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
						<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
						<p className="text-[10px] leading-normal text-destructive">
							All file replicas for this project will be deleted from the
							replica store.
						</p>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="delete-confirm" className="text-xs">
							Type the project name <strong>{projectName}</strong> to confirm:
						</Label>
						<Input
							id="delete-confirm"
							placeholder={projectName}
							value={confirmName}
							onChange={(e) => onConfirmChange(e.target.value)}
							className="h-9 text-xs"
						/>
					</div>
				</div>
				<DialogFooter className="gap-2 sm:gap-0">
					<Button
						variant="outline"
						size="sm"
						className="h-9 text-xs"
						onClick={onCancel}
					>
						Cancel
					</Button>
					<Button
						variant="destructive"
						size="sm"
						className="h-9 text-xs"
						disabled={confirmName !== projectName || loading}
						onClick={onConfirm}
					>
						{loading ? "Deleting…" : "Delete project"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
