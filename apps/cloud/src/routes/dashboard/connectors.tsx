import {
	AlertCircle,
	CheckCircle2,
	Clock,
	Plus,
	ShieldCheck,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { useOutletContext } from "react-router";
import { GithubMark } from "~/components/site/brand-icons";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { cn } from "~/lib/utils";
import {
	type Connector,
	type ConnectorType,
	formatRelative,
	MOCK_ACCOUNT,
	MOCK_CONNECTORS,
	type Project,
} from "~/utils/mock-data";

const CATALOG = [
	{
		type: "github" as ConnectorType,
		name: "GitHub",
		desc: "Issues, PRs, and README files",
		icon: <GithubMark className="w-5 h-5" />,
		iconBg: "bg-zinc-900 text-white border border-zinc-800",
		available: true,
	},
	{
		type: "notion" as ConnectorType,
		name: "Notion",
		desc: "Pages and databases",
		icon: <span className="text-sm font-bold">N</span>,
		iconBg:
			"bg-zinc-50 border border-zinc-200 text-zinc-900 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-50",
		available: true,
	},
	{
		type: "linear" as ConnectorType,
		name: "Linear",
		desc: "Issues and projects",
		icon: <span className="text-sm font-bold">L</span>,
		iconBg: "bg-primary/15 border border-primary/20 text-primary",
		available: false,
	},
];

export function meta() {
	return [{ title: "Connectors — TekMemo Cloud" }];
}

export default function ConnectorsPage() {
	const { selectedProject } = useOutletContext<{ selectedProject: Project }>();
	const [connectors, setConnectors] = useState<Connector[]>(
		MOCK_CONNECTORS.filter(
			(c) => c.projectId === selectedProject.id,
		) as Connector[],
	);
	const [showAdd, setShowAdd] = useState(false);
	const [addStep, setAddStep] = useState<"pick" | "configure">("pick");
	const [pickType, setPickType] = useState<ConnectorType>("github");
	const [schedule, setSchedule] = useState("1h");
	const [sourceMapping, setSourceMapping] = useState("");

	const atCap = connectors.length >= MOCK_ACCOUNT.maxConnectors;

	const toggleEnabled = (id: string) => {
		setConnectors((prev) =>
			prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)),
		);
	};

	const removeConnector = (id: string) => {
		setConnectors((prev) => prev.filter((c) => c.id !== id));
	};

	const addConnector = () => {
		const newConn: Connector = {
			id: `con_${Math.random().toString(36).slice(2, 8)}`,
			projectId: selectedProject.id,
			type: pickType,
			enabled: true,
			schedule,
			sourceMapping,
			lastRunStatus: "never",
			lastRunAt: null,
			secretRef: `sec_${pickType}_${Math.random().toString(36).slice(2, 8)}`,
		};
		setConnectors((prev) => [...prev, newConn]);
		setShowAdd(false);
		setAddStep("pick");
		setSourceMapping("");
	};

	return (
		<div className="p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-bold tracking-tight mb-0.5">
						Connectors
					</h2>
					<p className="text-xs text-muted-foreground">
						Project{" "}
						<span className="font-mono text-foreground font-semibold">
							{selectedProject.name}
						</span>{" "}
						· {connectors.length} / {MOCK_ACCOUNT.maxConnectors} active
					</p>
				</div>
				<Button
					size="sm"
					onClick={() => setShowAdd(true)}
					disabled={atCap}
					className={cn("text-xs h-9", {
						"bg-primary text-primary-foreground hover:bg-primary/90": !atCap,
					})}
					title={atCap ? "Upgrade to add more connectors" : ""}
				>
					<Plus className="w-4 h-4 mr-1.5" />
					{atCap ? "Cap reached — upgrade" : "Add connector"}
				</Button>
			</div>

			{/* Catalog */}
			<div className="mb-8">
				<h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
					Available connectors
				</h4>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					{CATALOG.map((c) => {
						const isAdded = connectors.some((con) => con.type === c.type);
						return (
							<Card key={c.type} className={!c.available ? "opacity-50" : ""}>
								<CardContent className="p-4 flex items-center gap-3">
									<div
										className={cn(
											"w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
											c.iconBg,
										)}
									>
										{c.icon}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-xs font-medium text-foreground">
											{c.name}
										</p>
										<p className="text-[10px] text-muted-foreground truncate">
											{c.desc}
										</p>
									</div>
									{!c.available ? (
										<Badge variant="secondary" className="text-[9px] py-0 px-1">
											Soon
										</Badge>
									) : isAdded ? (
										<Badge
											variant="outline"
											className="text-[9px] py-0 px-1 text-primary border-primary/30 bg-primary/5"
										>
											Added
										</Badge>
									) : null}
								</CardContent>
							</Card>
						);
					})}
				</div>
			</div>

			{/* Per-connector cards */}
			{connectors.length === 0 ? (
				<div className="rounded-xl border border-dashed bg-muted/20 p-10 text-center">
					<p className="text-xs text-muted-foreground">
						No connectors added yet.
					</p>
					<Button
						size="sm"
						variant="outline"
						className="mt-3 text-xs h-8"
						onClick={() => setShowAdd(true)}
					>
						Add first connector
					</Button>
				</div>
			) : (
				<div className="space-y-4">
					{connectors.map((conn) => {
						const catalog = CATALOG.find((c) => c.type === conn.type);
						return (
							<Card key={conn.id}>
								<CardContent className="p-5">
									<div className="flex items-start justify-between mb-4">
										<div className="flex items-center gap-3">
											<div
												className={cn(
													"w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
													catalog?.iconBg,
												)}
											>
												{catalog?.icon}
											</div>
											<div>
												<p className="text-xs font-semibold capitalize text-foreground">
													{conn.type}
												</p>
												<p className="text-[10px] text-muted-foreground font-mono mt-0.5">
													{conn.sourceMapping}
												</p>
											</div>
										</div>
										<div className="flex items-center gap-4">
											<div className="flex items-center gap-1.5">
												<Switch
													id={`${conn.id}-enabled`}
													checked={conn.enabled}
													onCheckedChange={() => toggleEnabled(conn.id)}
												/>
												<Label
													htmlFor={`${conn.id}-enabled`}
													className="text-[10px] font-medium text-muted-foreground"
												>
													{conn.enabled ? "Active" : "Disabled"}
												</Label>
											</div>
											<Button
												size="icon"
												variant="ghost"
												className="w-8 h-8 hover:bg-muted text-muted-foreground hover:text-destructive"
												onClick={() => removeConnector(conn.id)}
											>
												<Trash2 className="w-3.5 h-3.5" />
											</Button>
										</div>
									</div>

									<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-4 border-t border-border/40">
										<div>
											<p className="text-[10px] text-muted-foreground mb-0.5">
												Schedule
											</p>
											<p className="font-semibold text-foreground">
												Every {conn.schedule}
											</p>
										</div>
										<div>
											<p className="text-[10px] text-muted-foreground mb-0.5">
												Last run
											</p>
											<div className="flex items-center gap-1">
												{conn.lastRunStatus === "success" ? (
													<CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
												) : conn.lastRunStatus === "never" ? (
													<Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
												) : (
													<AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
												)}
												<span className="text-[11px] text-foreground font-medium">
													{conn.lastRunStatus === "never" || !conn.lastRunAt
														? "Never"
														: formatRelative(conn.lastRunAt)}
												</span>
											</div>
										</div>
										<div>
											<p className="text-[10px] text-muted-foreground mb-0.5">
												Token status
											</p>
											<div className="flex items-center gap-1">
												<ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
												<span className="text-[11px] text-foreground font-medium">
													Encrypted
												</span>
											</div>
										</div>
										<div>
											<p className="text-[10px] text-muted-foreground mb-0.5">
												Secret ref
											</p>
											<code className="font-mono text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded border border-border/20">
												{conn.secretRef}
											</code>
										</div>
									</div>

									<div className="mt-4 pt-3 border-t border-border/20">
										<p className="text-[10px] text-muted-foreground flex items-center gap-1">
											<ShieldCheck className="w-3.5 h-3.5 text-primary/80 shrink-0" />
											Tokens are encrypted server-side and never written to your
											synced files.
										</p>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}

			{/* Add connector dialog */}
			<Dialog open={showAdd} onOpenChange={setShowAdd}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="text-base font-semibold">
							Add connector
						</DialogTitle>
						<DialogDescription className="text-xs">
							{addStep === "pick"
								? "Choose a connector type."
								: "Configure the connector."}
						</DialogDescription>
					</DialogHeader>

					{addStep === "pick" ? (
						<div className="space-y-2 py-2">
							{CATALOG.filter((c) => c.available).map((c) => (
								<button
									type="button"
									key={c.type}
									onClick={() => {
										setPickType(c.type);
										setAddStep("configure");
									}}
									className={cn(
										"w-full flex items-center gap-3 rounded-lg border p-3 hover:bg-muted text-left cursor-pointer transition-colors",
										{
											"border-primary bg-primary/5": pickType === c.type,
											"border-border/40 bg-card": pickType !== c.type,
										},
									)}
								>
									<div
										className={cn(
											"w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
											c.iconBg,
										)}
									>
										{c.icon}
									</div>
									<div className="text-left">
										<p className="text-xs font-semibold text-foreground">
											{c.name}
										</p>
										<p className="text-[10px] text-muted-foreground">
											{c.desc}
										</p>
									</div>
								</button>
							))}
						</div>
					) : (
						<div className="space-y-4 py-2">
							<div className="space-y-1.5">
								<Label className="text-xs">Source mapping</Label>
								<Input
									placeholder={
										pickType === "github"
											? "repos: org/*"
											: "workspace: Engineering"
									}
									value={sourceMapping}
									onChange={(e) => setSourceMapping(e.target.value)}
									className="text-xs h-9"
								/>
							</div>
							<div className="space-y-1.5">
								<Label className="text-xs">Schedule</Label>
								<Select value={schedule} onValueChange={setSchedule}>
									<SelectTrigger className="text-xs h-9">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="30m" className="text-xs">
											Every 30 minutes
										</SelectItem>
										<SelectItem value="1h" className="text-xs">
											Every 1 hour
										</SelectItem>
										<SelectItem value="6h" className="text-xs">
											Every 6 hours
										</SelectItem>
										<SelectItem value="24h" className="text-xs">
											Daily
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="rounded-lg border border-border/40 bg-muted/40 p-3">
								<p className="text-[10px] text-muted-foreground leading-normal">
									You'll be redirected to authenticate with{" "}
									{pickType === "github" ? "GitHub" : "Notion"} via OAuth. Your
									token is encrypted and stored server-side under a secret ref —
									it is never written to your synced files.
								</p>
							</div>
						</div>
					)}

					<DialogFooter className="gap-2 sm:gap-0">
						<Button
							variant="outline"
							size="sm"
							className="text-xs h-9"
							onClick={() => {
								setShowAdd(false);
								setAddStep("pick");
							}}
						>
							Cancel
						</Button>
						{addStep === "configure" && (
							<Button
								onClick={addConnector}
								disabled={!sourceMapping}
								size="sm"
								className="text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90"
							>
								Add connector
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
