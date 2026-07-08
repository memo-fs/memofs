import { FolderOpen, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useFetcher } from "react-router";
import type { ProjectSummary } from "~/.server/queries";
import { deleteProject, listProjectsForAccount } from "~/.server/queries";
import { requireUserWithAccount } from "~/.server/session";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { buildNoindexMeta } from "~/lib/seo";
import { formatBytes, formatRelative } from "~/utils/misc";
import { DeleteProjectDialog } from "./+components/delete-project-dialog";
import { NewProjectDialog } from "./+components/new-project-dialog";
import { PageHeader } from "./+components/page-header";
import type { Route } from "./+types/projects";

/**
 * Projects list (SC3.2). Reads the account's projects from the real DB; each
 * row links to its detail page. Deletion is a real action (typed-name
 * confirmation → `deleteProject`), and the optimistic table update is driven by
 * `useFetcher` so the page never fully reloads.
 *
 * Projects are read-only replicas at v1 (D1): they appear once the first push
 * lands, so a brand-new account sees an honest empty state, not seeded mocks.
 */

export function meta() {
	return buildNoindexMeta("Projects — Memo FS Cloud");
}

/** Server data: the account's projects, newest-updated first. */
export interface ProjectsLoaderData {
	projects: ProjectSummary[];
}

export async function loader({
	request,
}: Route.LoaderArgs): Promise<ProjectsLoaderData> {
	const { account } = await requireUserWithAccount(request);
	const projects = account ? await listProjectsForAccount(account.id) : [];
	return { projects };
}

/**
 * Delete action. The typed-name confirmation happens client-side; the action is
 * the server authority — it re-resolves ownership and only deletes a project
 * the signed-in account actually owns. Returns `{ ok: true }` on success so the
 * fetcher-driven UI can clear its pending state.
 */
export async function action({
	request,
}: Route.ActionArgs): Promise<{ ok: boolean }> {
	const { account } = await requireUserWithAccount(request);
	const form = await request.formData();
	const projectId = String(form.get("projectId") ?? "");
	if (!projectId) return { ok: false };

	if (!account) return { ok: false };

	await deleteProject(account.id, projectId);
	return { ok: true };
}

export default function ProjectsPage({ loaderData }: Route.ComponentProps) {
	const { projects } = loaderData;
	const [showNew, setShowNew] = useState(false);
	const [toDelete, setToDelete] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [confirmName, setConfirmName] = useState("");
	const deleteFetcher = useFetcher<{ ok: boolean }>();

	// Drop a row optimistically once its delete fetcher submits, before the
	// action returns. The loader will re-confirm on the next navigation.
	const deletingId = deleteFetcher.formData?.get("projectId");
	const visible =
		deletingId != null ? projects.filter((p) => p.id !== deletingId) : projects;

	const handleDelete = () => {
		if (!toDelete || confirmName !== toDelete.name) return;
		deleteFetcher.submit({ projectId: toDelete.id }, { method: "post" });
		setToDelete(null);
		setConfirmName("");
	};

	return (
		<div className="p-6">
			<PageHeader
				title="Projects"
				subtitle="Projects are auto-provisioned on first push."
				action={
					<Button
						size="sm"
						onClick={() => setShowNew(true)}
						className="h-9 text-xs"
					>
						<Plus className="mr-1.5 h-4 w-4" /> New project
					</Button>
				}
			/>

			<Card>
				<CardContent className="p-0">
					{visible.length === 0 ? (
						<div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
							<FolderOpen className="h-8 w-8 text-muted-foreground/40" />
							<p className="text-sm font-medium text-foreground">
								No projects yet
							</p>
							<p className="max-w-sm text-xs text-muted-foreground">
								Projects appear here after your first{" "}
								<code className="font-mono text-[10px]">memofs push</code>. Push
								from the CLI to provision one.
							</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="px-5 py-3 text-xs">Name</TableHead>
									<TableHead className="px-5 py-3 text-xs hidden sm:table-cell">
										Files
									</TableHead>
									<TableHead className="px-5 py-3 text-xs hidden md:table-cell">
										Storage
									</TableHead>
									<TableHead className="px-5 py-3 text-xs">Last sync</TableHead>
									<TableHead className="px-5 py-3 text-right text-xs">
										Actions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{visible.map((p) => (
									<TableRow key={p.id}>
										<TableCell className="px-5 py-3">
											<div className="flex items-center gap-2">
												<FolderOpen className="h-4 w-4 shrink-0 text-primary/80" />
												<Link
													to={`/dashboard/projects/${p.id}`}
													className="text-xs font-medium text-foreground hover:text-primary hover:underline"
												>
													{p.name}
												</Link>
											</div>
											<p className="pl-6 font-mono text-[10px] text-muted-foreground">
												{p.id}
											</p>
										</TableCell>
										<TableCell className="px-5 py-3 text-xs text-muted-foreground hidden sm:table-cell">
											{p.fileCount}
										</TableCell>
										<TableCell className="px-5 py-3 text-xs text-muted-foreground hidden md:table-cell">
											{formatBytes(p.storageBytes)}
										</TableCell>
										<TableCell className="px-5 py-3 text-xs text-muted-foreground">
											{p.lastSyncAt ? formatRelative(p.lastSyncAt) : "Never"}
										</TableCell>
										<TableCell className="px-5 py-3 text-right text-xs">
											<div className="flex items-center justify-end gap-1">
												<Button
													size="sm"
													variant="ghost"
													className="h-8 text-xs"
													asChild
												>
													<Link to={`/dashboard/projects/${p.id}`}>View</Link>
												</Button>
												<Button
													size="icon"
													variant="ghost"
													className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-destructive"
													onClick={() =>
														setToDelete({ id: p.id, name: p.name })
													}
													title="Delete project"
												>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<NewProjectDialog open={showNew} onOpenChange={setShowNew} />

			<DeleteProjectDialog
				open={!!toDelete}
				projectName={toDelete?.name ?? ""}
				confirmName={confirmName}
				onConfirmChange={setConfirmName}
				onCancel={() => {
					setToDelete(null);
					setConfirmName("");
				}}
				onConfirm={handleDelete}
				loading={deleteFetcher.state !== "idle"}
			/>
		</div>
	);
}
