import {
	AlertCircle,
	ArrowUpRight,
	CheckCircle2,
	Clock,
	Copy,
	HardDrive,
	Plug,
	RefreshCw,
	Terminal,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import {
	type Connector,
	formatBytes,
	formatRelative,
	MOCK_ACCOUNT,
	MOCK_CONNECTORS,
	type Project,
} from "~/utils/mock-data";

/**
 * The four SC3.1 overview cards, project-scoped. Each maps to a real data
 * source: sync status, storage usage (entitlement gate visible), connectors
 * health, and the copyable quick-start CLI command.
 */

export function OverviewCards({ project }: { project: Project }) {
	const projectConnectors = MOCK_CONNECTORS.filter(
		(c) => c.projectId === project.id,
	);
	const activeConnectors = projectConnectors.filter((c) => c.enabled).length;
	const storagePercent =
		(project.storageBytes / MOCK_ACCOUNT.maxStorageBytes) * 100;

	return (
		<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<SyncStatusCard project={project} />
			<StorageCard
				storageBytes={project.storageBytes}
				storagePercent={storagePercent}
				nearCap={storagePercent > 70}
			/>
			<ConnectorsCard
				active={activeConnectors}
				max={MOCK_ACCOUNT.maxConnectors}
				connectors={projectConnectors}
			/>
			<QuickStartCard projectName={project.name} />
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

function SyncStatusCard({ project }: { project: Project }) {
	return (
		<CardShell label="Sync status" icon={RefreshCw}>
			<p className="mb-1 text-xl font-bold">{project.fileCount} files</p>
			<p className="text-[10px] text-muted-foreground">
				Last sync {formatRelative(project.lastSyncAt)}
			</p>
			<code className="mt-1.5 block truncate rounded border border-border/30 bg-muted/20 px-1 font-mono text-[10px] text-primary">
				{project.cursor}
			</code>
		</CardShell>
	);
}

function StorageCard({
	storageBytes,
	storagePercent,
	nearCap,
}: {
	storageBytes: number;
	storagePercent: number;
	nearCap: boolean;
}) {
	return (
		<CardShell label="Storage" icon={HardDrive}>
			<p className="mb-1 text-xl font-bold">{formatBytes(storageBytes)}</p>
			<Progress value={storagePercent} className="mb-1.5 h-1.5" />
			<p className="text-[10px] text-muted-foreground">
				of {formatBytes(MOCK_ACCOUNT.maxStorageBytes)} · {MOCK_ACCOUNT.plan}{" "}
				plan
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

function ConnectorsCard({
	active,
	max,
	connectors,
}: {
	active: number;
	max: number;
	connectors: Connector[];
}) {
	return (
		<CardShell label="Connectors" icon={Plug}>
			<p className="mb-1 text-xl font-bold">
				{active}{" "}
				<span className="text-xs font-normal text-muted-foreground">
					/ {max}
				</span>
			</p>
			<div className="mt-1.5 space-y-1">
				{connectors.map((c) => (
					<div key={c.id} className="flex items-center gap-1.5">
						<RunStatusIcon status={c.lastRunStatus} />
						<span className="font-mono text-[10px] capitalize">{c.type}</span>
						{!c.enabled && (
							<Badge
								variant="secondary"
								className="h-3.5 px-1 py-0 text-[9px] leading-none"
							>
								off
							</Badge>
						)}
					</div>
				))}
			</div>
		</CardShell>
	);
}

function RunStatusIcon({ status }: { status: Connector["lastRunStatus"] }) {
	if (status === "success")
		return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />;
	if (status === "never")
		return <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
	return <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />;
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
