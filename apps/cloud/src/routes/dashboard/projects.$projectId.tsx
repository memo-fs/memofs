import { ArrowLeft, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFetcher, useNavigate } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { getEnv } from "~/server/context.server";
import type {
	CursorHistoryView,
	ProjectFileView,
	ProjectSummary,
} from "~/server/queries";
import {
	deleteProject,
	getProjectForAccount,
	listProjectCursorHistory,
	listProjectFiles,
} from "~/server/queries";
import { requireUserWithAccount } from "~/server/session.server";
import { formatBytes, formatRelative } from "~/utils/format";
import { DeleteProjectDialog } from "./+components/delete-project-dialog";
import { ProjectManifest } from "./+components/project-manifest";
import type { Route } from "./+types/projects.$projectId";

/**
 * Project detail (SC3.2). One loader resolves the project (ownership-gated — a
 * foreign id renders as 404, never a cross-account leak), its live file
 * manifest, and its full cursor history. Deletion is a real action that
 * re-checks ownership server-side, then redirects back to the list.
 *
 * All three reads are read-only at v1 (D1): files are authored locally and
 * pushed; the cloud is a replica. The manifest + cursor history reflect
 * committed push state.
 */

export function meta(_: Route.MetaArgs) {
	return [{ title: "Project Details — TekMemo Cloud" }];
}

/** Server data for the project detail page. */
export interface ProjectDetailLoaderData {
	project: ProjectSummary;
	files: ProjectFileView[];
	cursors: CursorHistoryView[];
}

export async function loader({
	request,
	context,
	params,
}: Route.LoaderArgs): Promise<ProjectDetailLoaderData> {
	const { db, account } = await requireUserWithAccount(
		request,
		getEnv(context),
	);
	const projectId = params.projectId ?? "";

	// Ownership gate: a project id from the URL that isn't owned by the signed-in
	// account resolves to null → a 404 Response. This is the same guard the
	// queries layer applies; we surface it as a clean not-found rather than a
	// cross-account data leak.
	const project = account
		? await getProjectForAccount(db, account.id, projectId)
		: null;
	if (!project) {
		throw new Response("Project not found", { status: 404 });
	}

	const [files, cursors] = await Promise.all([
		listProjectFiles(db, projectId),
		listProjectCursorHistory(db, projectId),
	]);
	return { project, files, cursors };
}

/**
 * Delete action — re-resolves ownership server-side (the signed-in account must
 * still own the project at click time), then returns a 204 the client uses to
 * navigate back to the list.
 */
export async function action({
	request,
	context,
	params,
}: Route.ActionArgs): Promise<{ ok: true }> {
	const { db, account } = await requireUserWithAccount(
		request,
		getEnv(context),
	);
	const projectId = params.projectId ?? "";
	if (account) {
		await deleteProject(db, account.id, projectId);
	}
	return { ok: true };
}

export default function ProjectDetailsPage({
	loaderData,
}: Route.ComponentProps) {
	const { project, files, cursors } = loaderData;
	const navigate = useNavigate();
	const [showDelete, setShowDelete] = useState(false);
	const [confirmName, setConfirmName] = useState("");
	const deleteFetcher = useFetcher<{ ok: true }>();

	const handleDelete = () => {
		if (confirmName !== project.name) return;
		deleteFetcher.submit(null, { method: "post" });
	};

	// Navigate back to the list once the delete action lands. Done during render
	// guarded by a ref-free transition: the fetcher flips from submitting→idle
	// with data set, exactly once.
	if (deleteFetcher.data?.ok) {
		navigate("/dashboard/projects");
	}

	return (
		<div className="p-6">
			<button
				type="button"
				onClick={() => navigate("/dashboard/projects")}
				className="mb-4 flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft className="h-3.5 w-3.5" /> All projects
			</button>

			<div className="mb-6 flex items-start justify-between">
				<div>
					<h2 className="mb-0.5 text-xl font-bold tracking-tight">
						{project.name}
					</h2>
					<p className="font-mono text-xs text-muted-foreground">
						{project.id}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant="secondary">{formatBytes(project.storageBytes)}</Badge>
					<Button
						size="sm"
						variant="outline"
						className="h-8 text-xs text-destructive border-destructive/20 hover:border-destructive hover:bg-destructive/5"
						onClick={() => setShowDelete(true)}
					>
						<Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
					</Button>
				</div>
			</div>

			<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
				{[
					{ label: "Files", value: project.fileCount.toString() },
					{
						label: "Last sync",
						value: project.lastSyncAt
							? formatRelative(project.lastSyncAt)
							: "Never",
					},
					{ label: "Cursor", value: project.cursor, mono: true },
				].map((stat) => (
					<Card key={stat.label}>
						<CardHeader className="pb-1.5">
							<CardDescription className="text-xs text-muted-foreground">
								{stat.label}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<p
								className={cn("text-sm font-semibold", {
									"font-mono text-primary/90": stat.mono,
									"text-foreground": !stat.mono,
								})}
							>
								{stat.value}
							</p>
						</CardContent>
					</Card>
				))}
			</div>

			<ProjectManifest files={files} cursors={cursors} />

			<DeleteProjectDialog
				open={showDelete}
				projectName={project.name}
				confirmName={confirmName}
				onConfirmChange={setConfirmName}
				onCancel={() => {
					setShowDelete(false);
					setConfirmName("");
				}}
				onConfirm={handleDelete}
				loading={deleteFetcher.state !== "idle"}
			/>
		</div>
	);
}
