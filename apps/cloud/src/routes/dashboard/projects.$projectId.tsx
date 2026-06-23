import { ArrowLeft, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { formatBytes, formatRelative, MOCK_PROJECTS } from "~/utils/mock-data";
import { DeleteProjectDialog } from "./+components/delete-project-dialog";
import { ProjectManifest } from "./+components/project-manifest";

export function meta() {
	return [{ title: "Project Details — TekMemo Cloud" }];
}

export default function ProjectDetailsPage() {
	const { projectId } = useParams();
	const navigate = useNavigate();
	const project = MOCK_PROJECTS.find((p) => p.id === projectId);

	const [showDelete, setShowDelete] = useState(false);
	const [confirmName, setConfirmName] = useState("");
	const [deleting, setDeleting] = useState(false);

	if (!project) {
		return (
			<div className="p-6">
				<p className="text-sm text-destructive">Project not found.</p>
				<Button
					size="sm"
					className="mt-4 h-9 text-xs"
					onClick={() => navigate("/dashboard/projects")}
				>
					<ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to projects
				</Button>
			</div>
		);
	}

	const handleDelete = async () => {
		if (confirmName !== project.name) return;
		setDeleting(true);
		await new Promise((r) => setTimeout(r, 800));
		setDeleting(false);
		setShowDelete(false);
		navigate("/dashboard/projects");
	};

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
					{ label: "Last sync", value: formatRelative(project.lastSyncAt) },
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

			<ProjectManifest projectId={project.id} />

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
				loading={deleting}
			/>
		</div>
	);
}
