import {
	ArrowUpRight,
	CheckCircle2,
	Copy,
	HardDrive,
	Plug,
	RefreshCw,
	Terminal,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import type { AccountView, ProjectSummary } from "~/server/queries";
import { formatBytes, formatRelative } from "~/utils/format";

/**
 * The four SC3.1 overview cards, project-scoped. Each maps to a real data
 * source: sync status, storage usage (entitlement gate visible), connectors
 * health (honest empty state — there is no `connectors` table; connectors run
 * locally per ADR Q1, so the cloud always reports 0 of N), and the copyable
 * quick-start CLI command.
 *
 * Storage usage is account-wide (entitlement cap), surfaced from the layout
 * loader's `usage`/`account` — the project's own storage is shown in the sync
 * card. The cap is the account's `maxHostedStorageBytes`.
 */
export function OverviewCards({
	project,
	account,
	usage,
}: {
	project: ProjectSummary | null;
	account: AccountView | null;
	usage: { storageBytes: number; connectorsUsed: number };
}) {
	const maxStorage = account?.maxHostedStorageBytes ?? 0;
	const storagePercent =
		maxStorage > 0 ? (usage.storageBytes / maxStorage) * 100 : 0;

	return (
		<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<SyncStatusCard project={project} />
			<StorageCard
				usedBytes={usage.storageBytes}
				maxBytes={maxStorage}
				storagePercent={storagePercent}
				nearCap={storagePercent > 70}
				plan={account?.plan ?? "free"}
			/>
			<ConnectorsCard max={account?.maxConnectors ?? 0} />
			<QuickStartCard projectName={project?.name ?? "your-project"} />
		</div>
	);
}

function CardShell({
	label,
	icon: Icon,
	children,
}: {
	label: string;
	icon: typeof RefreshCw;
	children: React.ReactNode;
}) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<CardTitle className="text-xs font-semibold text-muted-foreground">
						{label}
					</CardTitle>
					<Icon className="h-4 w-4 text-muted-foreground" />
				</div>
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	);
}

function SyncStatusCard({ project }: { project: ProjectSummary | null }) {
	return (
		<CardShell label="Sync status" icon={RefreshCw}>
			<p className="mb-1 text-xl font-bold">{project?.fileCount ?? 0} files</p>
			<p className="text-[10px] text-muted-foreground">
				{project?.lastSyncAt
					? `Last sync ${formatRelative(project.lastSyncAt)}`
					: "Never synced"}
			</p>
			<code className="mt-1.5 block truncate rounded border border-border/30 bg-muted/20 px-1 font-mono text-[10px] text-primary">
				{project?.cursor ?? "—"}
			</code>
		</CardShell>
	);
}

function StorageCard({
	usedBytes,
	maxBytes,
	storagePercent,
	nearCap,
	plan,
}: {
	usedBytes: number;
	maxBytes: number;
	storagePercent: number;
	nearCap: boolean;
	plan: AccountView["plan"];
}) {
	return (
		<CardShell label="Storage" icon={HardDrive}>
			<p className="mb-1 text-xl font-bold">{formatBytes(usedBytes)}</p>
			<Progress value={storagePercent} className="mb-1.5 h-1.5" />
			<p className="text-[10px] text-muted-foreground">
				{maxBytes > 0
					? `of ${formatBytes(maxBytes)} · ${plan} plan`
					: "No storage cap"}
			</p>
			{nearCap && (
				<Link
					to="/dashboard/billing"
					className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
				>
					Upgrade <ArrowUpRight className="h-3 w-3" />
				</Link>
			)}
		</CardShell>
	);
}

/**
 * Connectors health card. There is no cloud-side `connectors` table (connectors
 * run locally per ADR Q1; config is the synced `connectors.json` blob), so this
 * truthfully reports 0 of the account's cap. When a table lands, this becomes
 * the live count without changing the card shape.
 */
function ConnectorsCard({ max }: { max: number }) {
	return (
		<CardShell label="Connectors" icon={Plug}>
			<p className="mb-1 text-xl font-bold">
				0{" "}
				<span className="text-xs font-normal text-muted-foreground">
					/ {max}
				</span>
			</p>
			<p className="text-[10px] text-muted-foreground">
				Connectors run locally — cloud shows none yet.
			</p>
		</CardShell>
	);
}

function QuickStartCard({ projectName }: { projectName: string }) {
	const [copied, setCopied] = useState(false);
	const command = `tekmemo pull --project ${projectName}`;

	const copy = () => {
		navigator.clipboard.writeText(command).catch(() => {});
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<CardShell label="Quick start" icon={Terminal}>
			<CardDescription className="mb-2 text-[10px] leading-none">
				Run on a new machine:
			</CardDescription>
			<div className="flex items-center gap-1.5 rounded-md bg-muted/65 px-2 py-1">
				<code className="flex-1 truncate font-mono text-[9px] text-foreground">
					{command}
				</code>
				<button
					type="button"
					onClick={copy}
					title="Copy command"
					className="shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
				>
					{copied ? (
						<CheckCircle2 className="h-3.5 w-3.5 text-primary" />
					) : (
						<Copy className="h-3.5 w-3.5" />
					)}
				</button>
			</div>
			<Link
				to="/dashboard/api-keys"
				className="mt-2 inline-block text-[10px] text-primary hover:underline"
			>
				Manage API keys →
			</Link>
		</CardShell>
	);
}
