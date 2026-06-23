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
 * "Register a new project" modal (SC3.2). Per Q13, projects are auto-provisioned
 * on first push — this modal registers a name and surfaces the CLI command to
 * push to it; the row appears in the table only once the first push lands.
 */
export function NewProjectDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="text-base font-semibold">
						Register a new project
					</DialogTitle>
					<DialogDescription className="text-xs">
						Projects are created on first push. Registering a name gives you the
						CLI command to use.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="space-y-1.5">
						<Label htmlFor="project-name" className="text-xs">
							Project name
						</Label>
						<Input
							id="project-name"
							placeholder="my-laptop"
							className="h-9 text-xs"
						/>
						<p className="text-[10px] text-muted-foreground">
							Lowercase letters, numbers, and hyphens only.
						</p>
					</div>
				</div>
				<DialogFooter className="gap-2 sm:gap-0">
					<Button
						variant="outline"
						size="sm"
						className="h-9 text-xs"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						size="sm"
						className="h-9 text-xs"
						onClick={() => onOpenChange(false)}
					>
						Done
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
