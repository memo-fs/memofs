import {
	AlertTriangle,
	CheckCircle2,
	Copy,
	Eye,
	EyeOff,
	KeyRound,
	Plus,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { formatDate, formatRelative, MOCK_API_KEYS } from "~/utils/mock-data";

interface ApiKey {
	id: string;
	label: string;
	lastFour: string;
	createdAt: string;
	lastSeen: string;
	revokedAt: string | null;
}

const REVEALED_KEY =
	"tk_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6";

export function meta() {
	return [{ title: "API Keys — TekMemo Cloud" }];
}

export default function ApiKeysPage() {
	const [keys, setKeys] = useState<ApiKey[]>(MOCK_API_KEYS);
	const [showCreate, setShowCreate] = useState(false);
	const [label, setLabel] = useState("");
	const [createdKey, setCreatedKey] = useState<{
		key: string;
		label: string;
	} | null>(null);
	const [copied, setCopied] = useState(false);
	const [showKey, setShowKey] = useState(false);
	const [revokeId, setRevokeId] = useState<string | null>(null);

	const createKey = () => {
		const newKey: ApiKey = {
			id: `key_${Math.random().toString(36).slice(2, 8)}`,
			label,
			lastFour: Math.random().toString(36).slice(2, 6),
			createdAt: new Date().toISOString(),
			lastSeen: new Date().toISOString(),
			revokedAt: null,
		};
		setKeys((prev) => [...prev, newKey]);
		setCreatedKey({ key: REVEALED_KEY, label });
		setShowCreate(false);
		setLabel("");
	};

	const revokeKey = (id: string) => {
		setKeys((prev) =>
			prev.map((k) =>
				k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k,
			),
		);
		setRevokeId(null);
	};

	const copy = (text: string) => {
		navigator.clipboard.writeText(text).catch(() => {});
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-bold tracking-tight mb-0.5">API Keys</h2>
					<p className="text-xs text-muted-foreground">
						Account-wide. Keys authenticate all sync operations.
					</p>
				</div>
				<Button
					size="sm"
					onClick={() => setShowCreate(true)}
					className="text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90"
				>
					<Plus className="w-4 h-4 mr-1.5" /> New key
				</Button>
			</div>

			<div className="rounded-lg border border-primary/20 bg-primary/5 flex items-start gap-3 px-4 py-3 mb-6">
				<AlertTriangle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
				<p className="text-xs text-primary/80 leading-normal">
					Raw API keys are shown <strong>only once at creation</strong>. We
					store a salted SHA-256 hash. Treat keys like passwords — never commit
					them to version control.
				</p>
			</div>

			<Card>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="px-5 py-3 text-xs">Label</TableHead>
								<TableHead className="px-5 py-3 text-xs hidden sm:table-cell">
									Key
								</TableHead>
								<TableHead className="px-5 py-3 text-xs hidden md:table-cell">
									Created
								</TableHead>
								<TableHead className="px-5 py-3 text-xs">Last seen</TableHead>
								<TableHead className="px-5 py-3 text-xs">Status</TableHead>
								<TableHead className="px-5 py-3 text-xs text-right">
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{keys.map((key) => (
								<TableRow
									key={key.id}
									className={key.revokedAt ? "opacity-50" : ""}
								>
									<TableCell className="px-5 py-3 text-xs">
										<div className="flex items-center gap-2">
											<KeyRound className="w-4 h-4 text-primary/80 shrink-0" />
											<span className="font-medium text-foreground">
												{key.label}
											</span>
										</div>
									</TableCell>
									<TableCell className="px-5 py-3 text-xs hidden sm:table-cell">
										<code className="font-mono text-muted-foreground text-[10px]">
											tk_live_…{key.lastFour}
										</code>
									</TableCell>
									<TableCell className="px-5 py-3 text-xs hidden md:table-cell text-muted-foreground">
										{formatDate(key.createdAt)}
									</TableCell>
									<TableCell className="px-5 py-3 text-xs text-muted-foreground">
										{key.revokedAt
											? formatDate(key.revokedAt)
											: formatRelative(key.lastSeen)}
									</TableCell>
									<TableCell className="px-5 py-3 text-xs">
										{key.revokedAt ? (
											<Badge
												variant="destructive"
												className="text-[10px] py-0 px-1.5 h-5 leading-none"
											>
												Revoked
											</Badge>
										) : (
											<Badge
												variant="outline"
												className="text-[10px] py-0 px-1.5 h-5 leading-none text-primary border-primary/30 bg-primary/5"
											>
												Active
											</Badge>
										)}
									</TableCell>
									<TableCell className="px-5 py-3 text-xs text-right">
										{!key.revokedAt && (
											<Button
												size="sm"
												variant="ghost"
												className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/5"
												onClick={() => setRevokeId(key.id)}
											>
												Revoke
											</Button>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* Create key dialog */}
			<Dialog open={showCreate} onOpenChange={setShowCreate}>
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
								className="text-xs h-9"
							/>
						</div>
					</div>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button
							variant="outline"
							size="sm"
							className="text-xs h-9"
							onClick={() => setShowCreate(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={createKey}
							disabled={!label}
							size="sm"
							className="text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90"
						>
							Create key
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* One-time reveal dialog */}
			<Dialog
				open={!!createdKey}
				onOpenChange={() => {
					setCreatedKey(null);
					setShowKey(false);
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
						<div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 flex items-start gap-2">
							<AlertTriangle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
							<p className="text-[11px] text-primary/95 leading-normal">
								You won't see this key again after closing this dialog.
							</p>
						</div>
						<div className="rounded-lg border border-border/40 bg-muted/40 p-3">
							<p className="text-[10px] text-muted-foreground mb-1.5">
								Label:{" "}
								<strong className="text-foreground">{createdKey?.label}</strong>
							</p>
							<div className="flex items-center gap-2">
								<code className="font-mono text-xs flex-1 break-all text-foreground bg-muted px-1.5 py-0.5 rounded border border-border/40">
									{showKey ? createdKey?.key : `tk_live_${"•".repeat(42)}`}
								</code>
								<div className="flex gap-1 shrink-0">
									<button
										type="button"
										onClick={() => setShowKey((v) => !v)}
										className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded hover:bg-muted/80"
										title={showKey ? "Hide key" : "Show key"}
									>
										{showKey ? (
											<EyeOff className="w-4 h-4" />
										) : (
											<Eye className="w-4 h-4" />
										)}
									</button>
									<button
										type="button"
										onClick={() => copy(createdKey?.key ?? "")}
										className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded hover:bg-muted/80"
										title="Copy key"
									>
										{copied ? (
											<CheckCircle2 className="w-4 h-4 text-primary" />
										) : (
											<Copy className="w-4 h-4" />
										)}
									</button>
								</div>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							className="w-full text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90"
							onClick={() => {
								setCreatedKey(null);
								setShowKey(false);
							}}
						>
							I've copied it — close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Revoke confirm dialog */}
			<Dialog open={!!revokeId} onOpenChange={() => setRevokeId(null)}>
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
							className="text-xs h-9"
							onClick={() => setRevokeId(null)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							size="sm"
							className="text-xs h-9"
							onClick={() => revokeId && revokeKey(revokeId)}
						>
							Revoke key
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
