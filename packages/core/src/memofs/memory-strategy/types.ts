export interface StoredNote {
	id: string;
	title?: string;
	content: string;
	kind?: string;
	workspaceId?: string;
	projectId?: string;
	tags?: string[];
	createdAt: string;
}
