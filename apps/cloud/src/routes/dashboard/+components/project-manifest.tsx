import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	formatBytes,
	formatRelative,
	MOCK_FILES,
	MOCK_SYNC_CURSORS,
} from "~/utils/mock-data";

/**
 * Project detail body (SC3.2): the read-only file manifest + cursor history.
 * Both are read-only at v1 (D1) — files are authored locally and pushed; the
 * cloud is a replica.
 */
export function ProjectManifest({ projectId }: { projectId: string }) {
	const cursors = MOCK_SYNC_CURSORS.filter((c) => c.projectId === projectId);

	return (
		<>
			<Card className="mb-6">
				<CardHeader>
					<CardTitle className="text-sm font-semibold">File manifest</CardTitle>
					<CardDescription className="text-xs">
						Read-only view of synced files. Edit locally and push.
					</CardDescription>
				</CardHeader>
				<CardContent className="border-t border-border/40 p-0">
					<div className="divide-y divide-border/40">
						{MOCK_FILES.map((f) => (
							<div
								key={f.path}
								className="flex items-center justify-between px-5 py-3 text-xs"
							>
								<span className="truncate font-mono text-muted-foreground">
									{f.path}
								</span>
								<div className="ml-2 flex shrink-0 items-center gap-4 text-muted-foreground">
									<span className="hidden font-mono text-[10px] text-muted-foreground/60 sm:block">
										{f.sha256}
									</span>
									<span>{formatBytes(f.size)}</span>
									<span>{formatRelative(f.updatedAt)}</span>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-semibold">
						Cursor history
					</CardTitle>
					<CardDescription className="text-xs">
						Each push advances the cursor.
					</CardDescription>
				</CardHeader>
				<CardContent className="border-t border-border/40 p-0">
					<div className="divide-y divide-border/40">
						{cursors.map((c) => (
							<div
								key={c.id}
								className="flex items-center justify-between px-5 py-3 text-xs"
							>
								<code className="font-mono text-primary/80">{c.cursor}</code>
								<div className="flex items-center gap-4 text-muted-foreground">
									<span>{c.fileCount} files</span>
									<span>{formatRelative(c.createdAt)}</span>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</>
	);
}
