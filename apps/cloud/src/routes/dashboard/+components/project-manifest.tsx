import type { CursorHistoryView, ProjectFileView } from "~/.server/queries";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { formatBytes, formatRelative } from "~/utils/misc";

/**
 * Project detail body (SC3.2): the read-only file manifest + cursor history.
 * Both are read-only at v1 (D1) — files are authored locally and pushed; the
 * cloud is a replica. Pure-presentational: the data arrives via props from the
 * project-detail loader.
 */
export function ProjectManifest({
	files,
	cursors,
}: {
	files: ProjectFileView[];
	cursors: CursorHistoryView[];
}) {
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
					{files.length === 0 ? (
						<p className="px-5 py-6 text-center text-xs text-muted-foreground">
							No files synced yet. Push from the CLI to populate the manifest.
						</p>
					) : (
						<div className="divide-y divide-border/40">
							{files.map((f) => (
								<div
									key={f.id}
									className="flex items-center justify-between px-5 py-3 text-xs"
								>
									<span className="truncate font-mono text-muted-foreground">
										{f.path}
									</span>
									<div className="ml-2 flex shrink-0 items-center gap-4 text-muted-foreground">
										<span className="hidden font-mono text-[10px] text-muted-foreground/60 sm:block">
											{f.sha256.slice(0, 12)}…
										</span>
										<span>{formatBytes(f.sizeBytes)}</span>
										<span>{formatRelative(f.updatedAt)}</span>
									</div>
								</div>
							))}
						</div>
					)}
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
					{cursors.length === 0 ? (
						<p className="px-5 py-6 text-center text-xs text-muted-foreground">
							No cursors yet. This project has never been pushed.
						</p>
					) : (
						<div className="divide-y divide-border/40">
							{cursors.map((c) => (
								<div
									key={c.id}
									className="flex items-center justify-between px-5 py-3 text-xs"
								>
									<code className="font-mono text-primary/80">{c.cursor}</code>
									<div className="flex items-center gap-4 text-muted-foreground">
										<span className="font-mono text-[10px] text-muted-foreground/60">
											{c.kind}
										</span>
										<span>{formatRelative(c.createdAt)}</span>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</>
	);
}
