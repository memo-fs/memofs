import { AlertTriangle, CheckCircle2, Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";

/**
 * The one-time raw-key reveal dialog (SC3.x). Shows the full `tm_…` token
 * exactly once after creation, with show/hide + copy affordances. Once closed,
 * the key is gone forever — only its salted hash is persisted.
 *
 * Owns its own `copied` + `showKey` UI state; the raw key itself is passed in
 * from the parent (which lifts it out of the create fetcher's result).
 *
 * @param createdKey the one-time `{ rawKey, label }`, or `null` to keep closed.
 * @param onClose    called when the user dismisses the dialog.
 */
export function RevealKeyDialog({
	createdKey,
	onClose,
}: {
	createdKey: { rawKey: string; label: string } | null;
	onClose: () => void;
}) {
	const [showKey, setShowKey] = useState(false);
	const [copied, setCopied] = useState(false);

	const copy = (text: string) => {
		navigator.clipboard.writeText(text).catch(() => {});
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<Dialog
			open={!!createdKey}
			onOpenChange={(o) => {
				if (!o) {
					setShowKey(false);
					onClose();
				}
			}}
		>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="text-base font-semibold">
						Your new API key — save it now
					</DialogTitle>
					<DialogDescription className="text-xs">
						This is the only time you'll see the full key. Copy it before
						closing.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3 py-2">
					<div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
						<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
						<p className="text-[11px] leading-normal text-primary/95">
							You won't see this key again after closing this dialog.
						</p>
					</div>
					<div className="rounded-lg border border-border/40 bg-muted/40 p-3">
						<p className="mb-1.5 text-[10px] text-muted-foreground">
							Label:{" "}
							<strong className="text-foreground">{createdKey?.label}</strong>
						</p>
						<div className="flex items-center gap-2">
							<code className="flex-1 break-all rounded border border-border/40 bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
								{showKey ? createdKey?.rawKey : `tm_${"•".repeat(42)}`}
							</code>
							<div className="flex shrink-0 gap-1">
								<button
									type="button"
									onClick={() => setShowKey((v) => !v)}
									className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
									title={showKey ? "Hide key" : "Show key"}
								>
									{showKey ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</button>
								<button
									type="button"
									onClick={() => copy(createdKey?.rawKey ?? "")}
									className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
									title="Copy key"
								>
									{copied ? (
										<CheckCircle2 className="h-4 w-4 text-primary" />
									) : (
										<Copy className="h-4 w-4" />
									)}
								</button>
							</div>
						</div>
					</div>
				</div>
				<DialogFooter>
					<Button
						className="h-9 w-full text-xs"
						onClick={() => {
							setShowKey(false);
							onClose();
						}}
					>
						I've copied it — close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
