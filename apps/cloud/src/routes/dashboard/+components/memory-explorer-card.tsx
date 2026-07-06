import { RefreshCw, Search } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";

export interface MemoryItem {
	id: string;
	text?: string;
	summary?: string;
	score?: number;
	type?: string;
	category?: string;
	timestamp?: string;
}

interface MemoryExplorerCardProps {
	searchQuery: string;
	onSearchChange: (query: string) => void;
	memories: MemoryItem[];
	isLoading: boolean;
}

export function MemoryExplorerCard({
	searchQuery,
	onSearchChange,
	memories,
	isLoading,
}: MemoryExplorerCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-semibold">Memory Explorer</CardTitle>
				<CardDescription className="text-xs">
					Inspect the semantic graph indices and recall vectors stored inside
					your cloud replica
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="relative">
					<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						type="search"
						placeholder="Filter recalled memories..."
						className="pl-9 bg-background/50 rounded-none border-border"
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
					/>
				</div>

				<div className="border border-border divide-y divide-border/40">
					{isLoading ? (
						<div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
							<RefreshCw className="h-3.5 w-3.5 animate-spin" />
							Querying hosted memory runtime…
						</div>
					) : memories.length === 0 ? (
						<div className="p-6 text-center text-xs text-muted-foreground">
							{searchQuery
								? "No memories matching search query."
								: "No memories found in this project yet."}
						</div>
					) : (
						memories.map((node, _idx) => {
							const text = node.text || node.summary || "";
							const category = node.type || node.category || "Active";
							const score = typeof node.score === "number" ? node.score : 1.0;
							const timestamp = node.timestamp
								? new Date(node.timestamp).toLocaleDateString()
								: "Just now";

							return (
								<div
									key={node.id || `${category}-${text}`}
									className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
								>
									<div className="space-y-1">
										<p className="text-white font-medium leading-relaxed">
											{text}
										</p>
										<div className="flex items-center gap-2">
											<Badge
												variant="secondary"
												className="text-[10px] font-mono rounded-none uppercase tracking-wider"
											>
												{category}
											</Badge>
											<span className="text-[10px] text-muted-foreground">
												{timestamp}
											</span>
										</div>
									</div>
									<div className="flex items-center gap-2 shrink-0">
										<span className="text-xs text-muted-foreground font-mono">
											Score:
										</span>
										<Badge className="bg-primary/10 border border-primary/20 text-white font-mono text-xs rounded-none">
											{score.toFixed(2)}
										</Badge>
									</div>
								</div>
							);
						})
					)}
				</div>
			</CardContent>
		</Card>
	);
}
