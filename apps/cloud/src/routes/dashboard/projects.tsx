import { FolderOpen, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
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
import { formatBytes, formatRelative, MOCK_PROJECTS } from "~/utils/mock-data";
import { DeleteProjectDialog } from "./+components/delete-project-dialog";
import { NewProjectDialog } from "./+components/new-project-dialog";
import { PageHeader } from "./+components/page-header";

export function meta() {
	return [{ title: "Projects — TekMemo Cloud" }];
}

export default function ProjectsPage() {
	const [projects, setProjects] = useState(MOCK_PROJECTS);
	const [showNew, setShowNew] = useState(false);
	const [toDelete, setToDelete] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [confirmName, setConfirmName] = useState("");
	const [deleting, setDeleting] = useState(false);

	const handleDelete = async () => {
		if (!toDelete || confirmName !== toDelete.name) return;
		setDeleting(true);
		await new Promise((r) => setTimeout(r, 800));
		setProjects((prev) => prev.filter((p) => p.id !== toDelete.id));
		setToDelete(null);
		setConfirmName("");
		setDeleting(false);
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
							{projects.map((p) => (
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
										{formatRelative(p.lastSyncAt)}
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
												onClick={() => setToDelete({ id: p.id, name: p.name })}
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
				loading={deleting}
			/>
		</div>
	);
}
